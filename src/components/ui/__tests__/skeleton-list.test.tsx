import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkeletonList } from "../skeleton-list";

describe("SkeletonList", () => {
  it("renders the specified number of skeleton items", () => {
    render(<SkeletonList count={5} />);
    const items = screen.getAllByRole("status");
    expect(items).toHaveLength(5);
  });

  it("defaults to 3 items", () => {
    render(<SkeletonList />);
    const items = screen.getAllByRole("status");
    expect(items).toHaveLength(3);
  });
});
