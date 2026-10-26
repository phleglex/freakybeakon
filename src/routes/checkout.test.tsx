import type { ComponentType, ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "./checkout";
import { paystackEnabled } from "@/lib/paystack.server";
import { menu } from "@/lib/menu";

const state = vi.hoisted(() => ({ paystack: false }));

vi.mock("../../db/index.js", () => ({ db: {} }));
vi.mock("@/lib/orders.functions", () => ({
  getPaymentOptions: vi.fn(),
  placeOrder: vi.fn(),
}));
vi.mock("@/lib/cart", () => ({
  useCart: () => ({
    ready: true,
    lines: [{ item: menu[0], quantity: 1 }],
    subtotalCents: menu[0].priceCents,
    clear: vi.fn(),
  }),
}));
vi.mock("@/components/delivery-picker", () => ({ DeliveryPicker: () => null }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    options,
    useLoaderData: () => state,
  }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("checkout payment options", () => {
  it("shows and selects Pay online with a runtime Paystack key", () => {
    vi.stubGlobal("Netlify", {
      env: {
        get: (name: string) =>
          name === "PAYSTACK_PRIVATE_KEY" ? "test-only" : undefined,
      },
    });
    state.paystack = paystackEnabled();
    const Checkout = Route.options.component as ComponentType;
    render(<Checkout />);
    const online = screen.getByRole("radio", { name: /Pay online/ });
    expect(online).toBeChecked();
    expect(screen.getByText("Card or mobile money via Paystack")).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: /Pay at pickup/ }));
    expect(online).not.toBeChecked();
    fireEvent.click(online);
    expect(online).toBeChecked();
  });

  it("offers payment at pickup when the runtime key is missing", () => {
    vi.stubGlobal("Netlify", { env: { get: () => undefined } });
    state.paystack = paystackEnabled();
    const Checkout = Route.options.component as ComponentType;
    render(<Checkout />);
    expect(
      screen.queryByRole("radio", { name: /Pay online/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Pay at pickup/ })).toBeChecked();
  });
});
