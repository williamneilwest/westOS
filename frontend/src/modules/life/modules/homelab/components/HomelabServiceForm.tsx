import { useState } from 'react';
import { Button, Input } from '../../../components/ui';
import type { HomelabServiceItem } from '../types';

interface HomelabServiceFormProps {
  onSubmit: (service: HomelabServiceItem) => void;
}

export function HomelabServiceForm({ onSubmit }: HomelabServiceFormProps) {
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('https://');

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          id: crypto.randomUUID(),
          name,
          endpoint,
          status: 'healthy',
          uptimeDays: 0,
        });
        setName('');
        setEndpoint('https://');
      }}
    >
      <Input label="Service Name" value={name} onChange={(event) => setName(event.target.value)} required />
      <Input label="Endpoint" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} required />
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit">Add Service</Button>
      </div>
    </form>
  );
}
