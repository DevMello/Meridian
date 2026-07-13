import { Panel, Lbl } from "@/components/meridian";
import { Logo } from "@/components/shell/Logo";

export default function SignUpPage() {
  return (
    <Panel corners className="p-8">
      <Logo />
      <Lbl accent className="mt-6 block">
        Create account
      </Lbl>
      <h1 className="h1 mt-2">Start sourcing with Meridian.</h1>
      <p className="sub">The create-account form is built by the Auth work unit.</p>
    </Panel>
  );
}
