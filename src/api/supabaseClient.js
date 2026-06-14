import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qgtpekhtoonqpoyirpvq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndHBla2h0b29ucXBveWlycHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTE2ODksImV4cCI6MjA5NTg4NzY4OX0.EkN2d-enn3d2j1OdQW7hhGHBvJ_ZdC0mec8sK9Mxjug'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentBusinessId = null

const TENANT_TABLES = new Set([
  'categories', 'products', 'dining_tables',
  'orders', 'room_sessions', 'service_requests',
])

export const setCurrentBusinessId = (id) => { currentBusinessId = id }
export const getCurrentBusinessId = () => currentBusinessId

const TABLE_MAP = {
  Order: 'orders',
  DiningTable: 'dining_tables',
  Category: 'categories',
  Product: 'products',
  RoomSession: 'room_sessions',
  Business: 'businesses',
  BusinessUser: 'business_users',
  UserInvitation: 'user_invitations',
  ServiceRequest: 'service_requests',
}

function createEntityAdapter(tableName) {
  const applyTenantFilter = (query) => {
    if (TENANT_TABLES.has(tableName) && currentBusinessId) {
      query = query.eq('business_id', currentBusinessId)
    }
    return query
  }

  return {
    async list(orderBy, limit) {
      let query = applyTenantFilter(supabase.from(tableName).select('*'))
      if (orderBy) {
        const desc = orderBy.startsWith('-')
        const col = orderBy.replace(/^-/, '')
        query = query.order(col, { ascending: !desc })
      }
      if (limit) query = query.limit(limit)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },

    async filter(filters, orderBy) {
      let query = applyTenantFilter(supabase.from(tableName).select('*'))
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }
      if (orderBy) {
        const desc = orderBy.startsWith('-')
        const col = orderBy.replace(/^-/, '')
        query = query.order(col, { ascending: !desc })
      }
      const { data, error } = await query
      if (error) throw error
      return data || []
    },

    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single()
      if (error) throw error
      return data
    },

    async create(item) {
      const payload = { ...item, created_date: new Date().toISOString() }
      if (TENANT_TABLES.has(tableName) && currentBusinessId) {
        payload.business_id = currentBusinessId
      }
      const { data, error } = await supabase.from(tableName).insert([payload]).select().single()
      if (error) throw error
      return data
    },

    async update(id, updates) {
      let query = supabase.from(tableName).update(updates).eq('id', id)
      if (TENANT_TABLES.has(tableName) && currentBusinessId) {
        query = query.eq('business_id', currentBusinessId)
      }
      const { data, error } = await query.select().single()
      if (error) throw error
      return data
    },

    async delete(id) {
      let query = supabase.from(tableName).delete().eq('id', id)
      if (TENANT_TABLES.has(tableName) && currentBusinessId) {
        query = query.eq('business_id', currentBusinessId)
      }
      const { error } = await query
      if (error) throw error
      return {}
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`${tableName}_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
        .subscribe()
      return () => supabase.removeChannel(channel)
    },
  }
}

const entities = new Proxy({}, {
  get(_, entityName) {
    const tableName = TABLE_MAP[entityName]
    if (!tableName) throw new Error('Unknown entity: ' + entityName)
    return createEntityAdapter(tableName)
  },
})

const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('Not authenticated')
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      role: user.user_metadata?.role || 'admin',
      business_id: user.user_metadata?.business_id || null,
    }
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  async register({ email, password, full_name, role = 'cashier', business_id = null }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, role, business_id } },
    })
    if (error) throw new Error(error.message)
    return data
  },

  async logout(redirectTo) {
    await supabase.auth.signOut()
    window.location.href = typeof redirectTo === 'string' ? redirectTo : '/login'
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) throw new Error(error.message)
  },

  async resetPassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(error.message)
  },
}

export const db = { auth, entities }
export default db
