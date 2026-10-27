import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleAlertIcon } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/ui/design-system/components/alert";

const meta = {
  component: Alert,
  render: (args) => (
    <Alert {...args} className="w-80">
      <CircleAlertIcon />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>Something needs your attention.</AlertDescription>
    </Alert>
  ),
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: "default" } };
export const Destructive: Story = { args: { variant: "destructive" } };
