import { useState } from 'react';
import { Button, Input } from '../../../components/ui';
import type { ToolLink } from '../types';

interface QuickLinkFormProps {
  onSubmit: (link: ToolLink) => void;
}

export function QuickLinkForm({ onSubmit }: QuickLinkFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [category, setCategory] = useState('General');

  return (
    <form
      className="grid gap-3 md:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();

        onSubmit({
          id: crypto.randomUUID(),
          name,
          url,
          category,
        });

        setName('');
        setUrl('https://');
        setCategory('General');
      }}
    >
      <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
      <Input label="URL" value={url} onChange={(event) => setUrl(event.target.value)} required />
      <Input label="Category" value={category} onChange={(event) => setCategory(event.target.value)} required />
      <div className="md:col-span-3 flex justify-end">
        <Button type="submit">Save Link</Button>
      </div>
    </form>
  );
}
