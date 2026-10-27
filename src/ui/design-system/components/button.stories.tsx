import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PlusIcon } from "lucide-react";
import { fn } from "storybook/test";
import { Button } from "@/ui/design-system/components/button";

const meta = {
  component: Button,
  args: { children: "Button", onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: "default" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Destructive: Story = { args: { variant: "destructive" } };
export const Link: Story = { args: { variant: "link" } };
export const Disabled: Story = { args: { disabled: true } };

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args} size="xs" />
      <Button {...args} size="sm" />
      <Button {...args} size="default" />
      <Button {...args} size="lg" />
    </div>
  ),
};

export const IconSizes: Story = {
  args: { children: <PlusIcon />, "aria-label": "Add" },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args} size="icon-xs" />
      <Button {...args} size="icon-sm" />
      <Button {...args} size="icon" />
      <Button {...args} size="icon-lg" />
    </div>
  ),
};
