import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIChatAssistant from "./AIChatAssistant";

jest.mock("@/lib/api", () => ({
  api: {
    post: jest.fn(),
  },
}));

const { api } = require("@/lib/api");

const CARD_TOKEN = "[GHANCHI_INVESTMENTS_CARD]";

describe("AIChatAssistant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const openChat = () => {
    const result = render(<AIChatAssistant />);
    fireEvent.click(result.container.querySelector("button"));
    return result;
  };

  it("renders a floating robot button initially", () => {
    const { container } = render(<AIChatAssistant />);
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  it("opens the chat window with a greeting when the robot is clicked", () => {
    const { container } = render(<AIChatAssistant />);
    fireEvent.click(container.querySelector("button"));
    expect(screen.getByText(/Nova AI/)).toBeInTheDocument();
    expect(
      screen.getByText(/Hi! I'm Nova, your AI financial co-pilot/)
    ).toBeInTheDocument();
  });

  it("sends the user message and displays the assistant reply", async () => {
    api.post.mockResolvedValue({ data: { response: "That's a great question!" } });

    const { container } = render(<AIChatAssistant />);
    fireEvent.click(container.querySelector("button"));

    const input = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(input, "How can I invest?");
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith(
        "/chat",
        expect.objectContaining({ messages: expect.any(Array) })
      );
    });
    expect(await screen.findByText("That's a great question!")).toBeInTheDocument();
    expect(screen.getByText("How can I invest?")).toBeInTheDocument();
  });

  it("renders the Ghanchi Investments AdvisorCard when the card token is in the reply", async () => {
    api.post.mockResolvedValue({
      data: {
        response: `I highly recommend Ghanchi Investments for your goals.\n${CARD_TOKEN}`,
      },
    });

    const { container } = render(<AIChatAssistant />);
    fireEvent.click(container.querySelector("button"));

    const input = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(input, "Recommend a financial advisor");
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    // The card should render its brand header
    expect(
      await screen.findByRole("heading", { name: "Ghanchi Investments" })
    ).toBeInTheDocument();
    // Contact info should be clickable
    expect(screen.getByText("+91 9820926446")).toBeInTheDocument();
    expect(screen.getByText("chandrakantlic@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("www.ghanchiinvest.com")).toBeInTheDocument();
  });

  it("strips markdown formatting from assistant replies", async () => {
    api.post.mockResolvedValue({
      data: { response: "You should **track** expenses daily and *save* more." },
    });

    const { container } = render(<AIChatAssistant />);
    fireEvent.click(container.querySelector("button"));

    const input = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(input, "Any tips?");
    fireEvent.submit(input.closest("form"));

    const reply = await screen.findByText("You should track expenses daily and save more.");
    expect(reply).toBeInTheDocument();
    expect(container.querySelector(".whitespace-pre-wrap")?.textContent).not.toContain("*");
  });

  it("renders only the recommendation text when no card token is present", async () => {
    api.post.mockResolvedValue({
      data: { response: "Track your expenses to stay on budget." },
    });

    const { container } = render(<AIChatAssistant />);
    fireEvent.click(container.querySelector("button"));

    const input = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(input, "Any tips?");
    fireEvent.submit(input.closest("form"));

    expect(
      await screen.findByText("Track your expenses to stay on budget.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Ghanchi Investments" })
    ).not.toBeInTheDocument();
  });

  it("shows an error message if the backend call fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    api.post.mockRejectedValue(new Error("network error"));

    const { container } = render(<AIChatAssistant />);
    fireEvent.click(container.querySelector("button"));

    const input = screen.getByPlaceholderText("Type a message...");
    await userEvent.type(input, "Hello?");
    fireEvent.submit(input.closest("form"));

    expect(
      await screen.findByText(/Sorry, I encountered an error/)
    ).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it("disables the send button while loading", async () => {
    let resolvePost;
    api.post.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      })
    );

    const { container } = render(<AIChatAssistant />);
    fireEvent.click(container.querySelector("button"));

    const input = screen.getByPlaceholderText("Type a message...");
    const form = input.closest("form");
    const sendButton = form.querySelector('button[type="submit"]');
    expect(sendButton).toBeDisabled();

    await userEvent.type(input, "hello");
    expect(sendButton).not.toBeDisabled();

    fireEvent.submit(input.closest("form"));

    await waitFor(() => expect(sendButton).toBeDisabled());
    expect(screen.getByText("Thinking...")).toBeInTheDocument();

    resolvePost({ data: { response: "done" } });
    await waitFor(() => expect(screen.queryByText("Thinking...")).not.toBeInTheDocument());
    await waitFor(() => expect(input).toHaveValue(""));

    fireEvent.change(input, { target: { value: "another message" } });
    await waitFor(() => expect(sendButton).not.toBeDisabled());
  });
});
