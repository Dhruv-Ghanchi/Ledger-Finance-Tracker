import React from "react";
import { render, screen } from "@testing-library/react";
import AdvisorCard from "./AdvisorCard";

describe("AdvisorCard", () => {
  it("renders the Ghanchi Investments brand header", () => {
    render(<AdvisorCard />);
    expect(
      screen.getByRole("heading", { name: "Ghanchi Investments" })
    ).toBeInTheDocument();
  });

  it("shows the advisor name and experience", () => {
    render(<AdvisorCard />);
    expect(
      screen.getByText("Chandrakant B. Ghanchi (16+ Yrs)")
    ).toBeInTheDocument();
  });

  it("provides a click-to-call phone link", () => {
    render(<AdvisorCard />);
    const phone = screen.getByText("+91 9820926446");
    expect(phone).toBeInTheDocument();
    expect(phone.closest("a")).toHaveAttribute("href", "tel:+919820926446");
  });

  it("provides an email link", () => {
    render(<AdvisorCard />);
    const email = screen.getByText("chandrakantlic@gmail.com");
    expect(email).toBeInTheDocument();
    expect(email.closest("a")).toHaveAttribute("href", "mailto:chandrakantlic@gmail.com");
  });

  it("provides a website link that opens in a new tab", () => {
    render(<AdvisorCard />);
    const website = screen.getByText("www.ghanchiinvest.com");
    const link = website.closest("a");
    expect(link).toHaveAttribute("href", "https://www.ghanchiinvest.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("provides a Google Maps directions link", () => {
    render(<AdvisorCard />);
    const address = screen.getByText(/Shop No\. 27, Sector 11, CBD Belapur/);
    const link = address.closest("a");
    expect(link).toHaveAttribute(
      "href",
      "https://maps.google.com/?q=Ghanchi+Investments+CBD+Belapur"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders all contact rows (phone, email, website, address)", () => {
    const { container } = render(<AdvisorCard />);
    expect(container.querySelectorAll("a")).toHaveLength(4);
  });

  it("uses the brand blue (#0F52BA) accent in the icon block", () => {
    const { container } = render(<AdvisorCard />);
    const iconBox = container.querySelector(".bg-\\[\\#0F52BA\\]");
    expect(iconBox).toBeTruthy();
  });
});
