// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserMenu } from "@/components/layout/user-menu";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({}) } }),
}));

describe("UserMenu", () => {
  it("renders the user's name on the trigger", () => {
    render(<UserMenu name="Daryll" isAdmin={false} />);
    expect(screen.getByRole("button", { name: "Daryll" })).toBeInTheDocument();
  });
});
