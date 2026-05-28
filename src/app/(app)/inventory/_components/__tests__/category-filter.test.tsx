import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { CategoryFilter } from "../category-filter";
import { createQueryWrapper } from "@/test/query-wrapper";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("CategoryFilter", () => {
  it("renders nothing when no categories", async () => {
    server.use(http.get("/api/categories", () => HttpResponse.json([])));

    const { wrapper } = createQueryWrapper();
    const { container } = render(
      <CategoryFilter value={undefined} onChange={() => {}} />,
      { wrapper }
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("renders All chip plus category chips", async () => {
    const { wrapper } = createQueryWrapper();
    render(
      <CategoryFilter value={undefined} onChange={() => {}} />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Dairy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Meat & Fish" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fruits" })).toBeInTheDocument();
  });

  it("calls onChange with category id when chip clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(
      <CategoryFilter value={undefined} onChange={onChange} />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dairy" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Dairy" }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("calls onChange with undefined when All clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(
      <CategoryFilter value={1} onChange={onChange} />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
