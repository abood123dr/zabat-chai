import React from "react";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/AuthLayout";
import { UserPlus } from "lucide-react";

export default function Register() {
  return (
    <AuthLayout
      icon={UserPlus}
      title="التسجيل مغلق"
      subtitle="الحسابات تُنشأ من قبل المدير فقط"
    >
      <p className="text-sm text-muted-foreground mb-6">
        لا يمكن إنشاء حساب جديد عبر الموقع. الرجاء استخدام الحساب الذي تم تزويدك به.
      </p>
      <Button onClick={() => (window.location.href = "/login")} className="w-full h-12 font-medium">
        العودة إلى تسجيل الدخول
      </Button>
    </AuthLayout>
  );
}

