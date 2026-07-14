import { Panel } from "@/components/meridian";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Panel corners className="p-8">
      <ResetPasswordForm />
    </Panel>
  );
}
