import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { ProjectItem, ProjectStatus } from '../../../types';

interface ProjectFormProps {
  onSubmit: (project: ProjectItem) => void;
}

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Backlog');
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [tags, setTags] = useState('');

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          id: crypto.randomUUID(),
          name,
          status,
          notes,
          link,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
          updatedAt: new Date().toISOString(),
        });
        setName('');
        setStatus('Backlog');
        setNotes('');
        setLink('');
        setTags('');
      }}
    >
      <Input label="Project name" value={name} onChange={(event) => setName(event.target.value)} required />
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        <span className="font-medium">Status</span>
        <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white">
          <option value="Backlog">Backlog</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Complete">Complete</option>
        </select>
      </label>
      <Input label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} required />
      <Input label="Link" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://..." />
      <Input label="Tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="React, Planning, Finance" />
      <div className="flex justify-end">
        <Button type="submit">Create Project</Button>
      </div>
    </form>
  );
}
