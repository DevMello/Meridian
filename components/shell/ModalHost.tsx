"use client";

import { Modal } from "@/components/meridian";
import { useModals } from "@/lib/hooks/useModals";

/**
 * Placeholder modal host. The "Modals" work unit replaces this with the full
 * MCP / Sources / Profile / New-project modals. Kept minimal so the header's
 * MCP button and avatar menu work in the foundation.
 */
export function ModalHost() {
  const { active, close } = useModals();
  return (
    <>
      <Modal open={active === "mcp"} onClose={close} title="MCP Server">
        <p className="sub">
          Connect Meridian to any MCP client. The full connection details and tool
          reference render here once the Modals unit lands.
        </p>
      </Modal>
      <Modal open={active === "sources"} onClose={close} title="Sources">
        <p className="sub">Provider toggles render here (Sources unit).</p>
      </Modal>
      <Modal open={active === "profile"} onClose={close} title="Profile">
        <p className="sub">Profile editor renders here (Modals unit).</p>
      </Modal>
      <Modal open={active === "new-project"} onClose={close} title="New Project">
        <p className="sub">New-project form renders here (Modals unit).</p>
      </Modal>
    </>
  );
}
