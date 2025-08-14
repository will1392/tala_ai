import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal
} from '../components/ui';
import { Search, Mail, Lock, User, Settings, Heart } from 'lucide-react';

const UIComponentShowcase = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
    { value: 'option4', label: 'Option 4 (Disabled)', disabled: true }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[var(--fg)] mb-4">
            UI Component Library
          </h1>
          <p className="text-[var(--muted)] text-lg">
            A consistent, themeable component library with CSS variables
          </p>
        </div>

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>
              Various button styles with primary, secondary, ghost, and destructive variants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Button Variants */}
            <div>
              <h3 className="text-sm font-medium text-[var(--muted)] mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive">Destructive Button</Button>
              </div>
            </div>

            {/* Button Sizes */}
            <div>
              <h3 className="text-sm font-medium text-[var(--muted)] mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            {/* Buttons with Icons */}
            <div>
              <h3 className="text-sm font-medium text-[var(--muted)] mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
                <Button variant="secondary">
                  <User className="w-4 h-4" />
                  Profile
                </Button>
                <Button variant="ghost">
                  <Heart className="w-4 h-4" />
                  Like
                </Button>
              </div>
            </div>

            {/* Disabled State */}
            <div>
              <h3 className="text-sm font-medium text-[var(--muted)] mb-3">Disabled State</h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled variant="primary">Disabled Primary</Button>
                <Button disabled variant="secondary">Disabled Secondary</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Controls Section */}
        <Card>
          <CardHeader>
            <CardTitle>Form Controls</CardTitle>
            <CardDescription>
              Input fields, textareas, selects, and labels with consistent styling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Input */}
            <div className="space-y-2">
              <Label htmlFor="basic-input">Basic Input</Label>
              <Input
                id="basic-input"
                placeholder="Enter some text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>

            {/* Input with Icons */}
            <div className="space-y-2">
              <Label htmlFor="search-input">Input with Start Icon</Label>
              <Input
                id="search-input"
                placeholder="Search..."
                startIcon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-input">Input with End Icon</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="Enter your email"
                endIcon={<Mail className="w-4 h-4" />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-input">Input with Both Icons</Label>
              <Input
                id="password-input"
                type="password"
                placeholder="Enter password"
                startIcon={<Lock className="w-4 h-4" />}
                endIcon={<User className="w-4 h-4" />}
              />
            </div>

            {/* Required Field */}
            <div className="space-y-2">
              <Label htmlFor="required-input" required>
                Required Field
              </Label>
              <Input
                id="required-input"
                placeholder="This field is required"
              />
            </div>

            {/* Error State */}
            <div className="space-y-2">
              <Label htmlFor="error-input" error>
                Field with Error
              </Label>
              <Input
                id="error-input"
                placeholder="Something went wrong"
                error
              />
              <p className="text-sm text-red-500">This field has an error</p>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <Label htmlFor="textarea">Textarea</Label>
              <Textarea
                id="textarea"
                placeholder="Enter a longer message..."
                rows={4}
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
              />
            </div>

            {/* Select */}
            <div className="space-y-2">
              <Label htmlFor="select">Select Dropdown</Label>
              <Select
                id="select"
                placeholder="Choose an option"
                options={selectOptions}
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
              />
            </div>

            {/* Disabled Controls */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--muted)]">Disabled States</h3>
              <Input disabled placeholder="Disabled input" />
              <Textarea disabled placeholder="Disabled textarea" />
              <Select
                disabled
                placeholder="Disabled select"
                options={selectOptions}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>
                A standard card with border
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--muted)]">
                This is the default card variant with a subtle border.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="ghost">Cancel</Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>

          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Bordered Card</CardTitle>
              <CardDescription>
                A card with prominent border
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--muted)]">
                This card has a stronger border for more emphasis.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="secondary">Learn More</Button>
            </CardFooter>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>
                A card with shadow elevation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--muted)]">
                This card uses shadows for a floating effect.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="primary">Get Started</Button>
            </CardFooter>
          </Card>
        </div>

        {/* Modal Section */}
        <Card>
          <CardHeader>
            <CardTitle>Modals</CardTitle>
            <CardDescription>
              Modals with different sizes and configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => { setModalSize('sm'); setModalOpen(true); }}>
                Small Modal
              </Button>
              <Button onClick={() => { setModalSize('md'); setModalOpen(true); }}>
                Medium Modal
              </Button>
              <Button onClick={() => { setModalSize('lg'); setModalOpen(true); }}>
                Large Modal
              </Button>
              <Button onClick={() => { setModalSize('xl'); setModalOpen(true); }}>
                Extra Large Modal
              </Button>
              <Button onClick={() => { setModalSize('full'); setModalOpen(true); }}>
                Full Width Modal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal Component */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`${modalSize.toUpperCase()} Modal Example`}
          size={modalSize}
        >
          <div className="space-y-4">
            <p className="text-[var(--muted)]">
              This is a {modalSize} sized modal. It demonstrates the consistent
              design system with proper theming support.
            </p>
            <div className="space-y-2">
              <Label htmlFor="modal-input">Example Input in Modal</Label>
              <Input
                id="modal-input"
                placeholder="Type something..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>

        {/* Theme Variables Info */}
        <Card>
          <CardHeader>
            <CardTitle>CSS Variables</CardTitle>
            <CardDescription>
              This component library uses CSS variables for theming
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-[var(--muted)] rounded-xl p-4 font-mono text-sm">
              <div className="space-y-1">
                <div>--primary: Theme primary color</div>
                <div>--border: Border color</div>
                <div>--panel: Panel background color</div>
                <div>--muted: Muted text/background color</div>
                <div>--ring: Focus ring color</div>
                <div>--fg: Foreground (text) color</div>
                <div>--bg: Background color</div>
              </div>
            </div>
            <p className="mt-4 text-[var(--muted)]">
              All components maintain a minimum height of 44px for optimal touch targets
              and use rounded-xl (12px) for consistent border radius.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UIComponentShowcase;