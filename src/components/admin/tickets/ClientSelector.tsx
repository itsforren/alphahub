import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ClientSelectorProps {
  value: string | null;
  onChange: (clientId: string | null) => void;
  className?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  profile_image_url: string | null;
}

export function ClientSelector({ value, onChange, className }: ClientSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients-selector'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, profile_image_url')
        .neq('status', 'cancelled')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedClient = clients.find((c) => c.id === value);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="w-[240px] justify-between font-normal"
          >
            {selectedClient ? (
              <span className="flex items-center gap-2 truncate">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={selectedClient.profile_image_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(selectedClient.name)}
                  </AvatarFallback>
                </Avatar>
                {selectedClient.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Select client...</span>
            )}
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search clients..." />
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.name} ${client.email}`}
                    onSelect={() => {
                      onChange(client.id === value ? null : client.id);
                      setOpen(false);
                    }}
                  >
                    <Avatar className="mr-2 h-6 w-6">
                      <AvatarImage src={client.profile_image_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col truncate">
                      <span className="text-sm">{client.name}</span>
                      <span className="text-xs text-muted-foreground">{client.email}</span>
                    </div>
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        value === client.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(null)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
