import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { HeaderView } from "@/features/auth/ui/HeaderView";
import { type User, UserId } from "@/types/User";

const meta = {
  component: HeaderView,
  args: { onEvent: fn() },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HeaderView>;

export default meta;
type Story = StoryObj<typeof meta>;

const user: User = {
  id: UserId.make(1),
  username: "emilys",
  email: "emily.johnson@x.dummyjson.com",
  firstName: "Emily",
  lastName: "Johnson",
  image: "https://dummyjson.com/icon/emilys/128",
};

export const Loading: Story = {
  args: { state: { _tag: "Loading", logout: "Idle" } },
};

export const Loaded: Story = {
  args: { state: { _tag: "Loaded", user, logout: "Idle" } },
};

export const LongName: Story = {
  args: {
    state: {
      _tag: "Loaded",
      user: {
        ...user,
        firstName: "Maximiliana-Alexandrina",
        lastName: "Vandenberghe-Oppenheimer",
        username: "maximiliana.alexandrina.vandenberghe.oppenheimer",
      },
      logout: "Idle",
    },
  },
};

export const Failed: Story = {
  args: { state: { _tag: "Failed", logout: "Idle" } },
};

export const LoggingOut: Story = {
  args: { state: { _tag: "Loaded", user, logout: "Pending" } },
};

export const LogoutFailed: Story = {
  args: { state: { _tag: "Loaded", user, logout: "Failed" } },
};
