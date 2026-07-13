import { Panel, Lbl } from "@/components/meridian";
import { Logo } from "@/components/shell/Logo";

export default function SignInPage() {
  return (
    <Panel corners className="p-8">
      <Logo />
      <Lbl accent className="mt-6 block">
        Sign in
      </Lbl>
      <h1 className="h1 mt-2">AI copilot for sourcing and managing your electronic components.</h1>
      <p className="sub">
        The full sign-in / create-account form (email + Google) is built by the Auth work
        unit.
      </p>
    </Panel>
  );
}
