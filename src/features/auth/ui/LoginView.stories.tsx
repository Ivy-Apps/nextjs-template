import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { LoginView } from "@/features/auth/ui/LoginView";
import type { LoginFields } from "@/features/auth/ui/useLoginViewModel.types";

const meta = {
  component: LoginView,
  args: { onEvent: fn() },
} satisfies Meta<typeof LoginView>;

export default meta;
type Story = StoryObj<typeof meta>;

const empty: LoginFields = { username: "", password: "" };
const filled: LoginFields = { username: "emilys", password: "emilyspass" };

export const Idle: Story = {
  args: { state: { _tag: "Idle", fields: filled } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Log in" }));
    await expect(args.onEvent).toHaveBeenCalledWith({ _tag: "Submit" });
  },
};

export const IdleEmpty: Story = {
  args: { state: { _tag: "Idle", fields: empty } },
};

export const Submitting: Story = {
  args: { state: { _tag: "Submitting", fields: filled } },
};

export const RejectedInvalidRequest: Story = {
  args: {
    state: { _tag: "Rejected", fields: empty, reason: "InvalidRequest" },
  },
};

export const RejectedInvalidCredentials: Story = {
  args: {
    state: { _tag: "Rejected", fields: filled, reason: "InvalidCredentials" },
  },
};

export const RejectedBackendUnavailable: Story = {
  args: {
    state: { _tag: "Rejected", fields: filled, reason: "BackendUnavailable" },
  },
};

export const LoggedIn: Story = {
  args: { state: { _tag: "LoggedIn", fields: filled } },
};
