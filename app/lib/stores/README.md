# Store Documentation

## Toast Store

The Toast Store provides a centralized way to manage toast notifications throughout the application using the Sonner toast library and Zustand for state management.

### Usage

```tsx
import { useToastStore } from '~/lib/stores/toastStore';

function MyComponent() {
  const { success, error, warning, info, loading, promise } = useToastStore();
  
  const handleSuccess = () => {
    success('Operation completed successfully!');
  };
  
  const handleError = () => {
    error('An error occurred');
  };
  
  const handleAsyncOperation = async () => {
    const myPromise = fetchData();
    
    promise(myPromise, {
      loading: 'Loading data...',
      success: 'Data loaded successfully!',
      error: 'Failed to load data',
    });
  };
  
  return (
    <button onClick={handleSuccess}>Show Success Toast</button>
  );
}
```

### API

The toast store provides the following methods:

#### Basic Toasts

- `toast(message, options?)` - Display a default toast
- `success(message, options?)` - Display a success toast with a checkmark icon
- `error(message, options?)` - Display an error toast with an error icon
- `warning(message, options?)` - Display a warning toast
- `info(message, options?)` - Display an info toast
- `loading(message, options?)` - Display a loading toast with a spinner

#### Promise Toast

- `promise(promise, options)` - Display a toast that changes based on the promise state
  - `options.loading` - Message to show while the promise is pending
  - `options.success` - Message to show when the promise resolves
  - `options.error` - Message to show when the promise rejects
  - `options.finally` - Function to call when the promise settles

#### Utility Methods

- `dismiss(toastId?)` - Dismiss a specific toast or all toasts

### Toast Options

All toast methods accept an options object that can include:

- `id` - Custom ID for the toast
- `description` - Additional description text
- `duration` - How long the toast should stay visible (in milliseconds)
- `icon` - Custom icon to display
- `action` - Action button configuration
- `cancel` - Cancel button configuration
- `onDismiss` - Function to call when the toast is dismissed
- `onAutoClose` - Function to call when the toast auto-closes
- `className` - Custom CSS class
- `dismissible` - Whether the toast can be dismissed by clicking

### Configuration

The Toaster component is configured in the root layout with the following options:

```tsx
<Toaster richColors position="top-right" />
```

To modify the toast appearance or behavior globally, update the Toaster component in `root.tsx`.
