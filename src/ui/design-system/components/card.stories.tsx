import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/ui/design-system/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/design-system/components/card";

const meta = {
  component: Card,
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>A short description of the card.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            Action
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>The card's content.</CardContent>
      <CardFooter>Footer</CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { size: "default" } };
export const Small: Story = { args: { size: "sm" } };
