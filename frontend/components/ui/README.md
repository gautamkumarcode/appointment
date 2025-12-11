# shadcn/ui Components Usage Guide

This directory contains shadcn/ui components that are now integrated into your appointment scheduler app.

## Available Components

### Form Components

- `Button` - Various button styles and sizes
- `Input` - Text input fields
- `Textarea` - Multi-line text input
- `Label` - Form labels
- `Select` - Dropdown select component
- `Form` - Form wrapper with validation

### Layout Components

- `Card` - Container with header, content sections
- `Dialog` - Modal dialogs
- `Alert` - Status messages and notifications

### Data Display

- `Table` - Data tables with proper styling
- `Badge` - Status indicators
- `Toast` - Notification toasts

### Interactive

- `DropdownMenu` - Context menus and dropdowns

## Usage Examples

### Basic Form with Validation

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Card Layout

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function MyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content...</p>
      </CardContent>
    </Card>
  );
}
```

### Dialog Modal

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function MyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>Dialog content goes here...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Toast Notifications

```tsx
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

function MyComponent() {
  const { toast } = useToast();

  const showToast = () => {
    toast({
      title: 'Success!',
      description: 'Your action was completed successfully.',
    });
  };

  return <Button onClick={showToast}>Show Toast</Button>;
}
```

### Alert Messages

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

function MyAlert() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Something went wrong. Please try again.</AlertDescription>
    </Alert>
  );
}
```

## Important Notes

1. **Import Paths**: Always use `@/components/ui/...` for importing shadcn components
2. **Form Validation**: Use `react-hook-form` with `zod` for form validation
3. **Styling**: Components use Tailwind CSS classes and CSS variables
4. **Icons**: Use `lucide-react` for icons
5. **Toast Setup**: Make sure `<Toaster />` is added to your root layout

## Troubleshooting

### Import Issues

- Make sure `@/` path alias is configured in `tsconfig.json`
- Check that all required dependencies are installed
- Avoid naming conflicts with other libraries (like PostCSS)

### Styling Issues

- Ensure Tailwind CSS is properly configured
- Check that CSS variables are defined in `globals.css`
- Verify `tailwind.config.ts` includes shadcn configuration

## Examples in This App

Check these files for real usage examples:

- `app/login/page.tsx` - Login form with validation
- `app/register/page.tsx` - Registration form
- `app/dashboard/services/ServiceForm.tsx` - Complex form with dialog
- `components/ShadcnShowcase.tsx` - Component showcase
