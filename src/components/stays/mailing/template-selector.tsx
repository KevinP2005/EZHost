import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { EmailTemplateDefinition } from '@/lib/email/mailing.types'
import { BLANK_TEMPLATE } from '@/lib/email/template-service'

interface TemplateSelectorProps {
  templates: EmailTemplateDefinition[]
  value: string | null
  onChange: (templateId: string) => void
  disabled?: boolean
}

export function TemplateSelector({ templates, value, onChange, disabled }: TemplateSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label>Template</Label>
      <Select
        value={value ?? ''}
        onValueChange={(v) => { if (v) onChange(v) }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Template auswählen…">
            {value
              ? ([...templates, BLANK_TEMPLATE].find((t) => t.id === value)?.name ?? value)
              : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {templates.map((tmpl) => (
            <SelectItem key={tmpl.id} value={tmpl.id}>
              {tmpl.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={BLANK_TEMPLATE.id}>
            {BLANK_TEMPLATE.name}
          </SelectItem>
        </SelectContent>
      </Select>
      {value && value !== BLANK_TEMPLATE.id && (
        <p className="text-xs text-muted-foreground">
          {templates.find((t) => t.id === value)?.description}
        </p>
      )}
    </div>
  )
}
