import type { ChatMessage } from '@akai/shared-types';
import Button from './Button';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn('flex gap-3', isAssistant ? 'justify-start' : 'justify-end')}>
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-bold text-xs flex-shrink-0 mt-1">
          AK
        </div>
      )}

      <div className={cn('max-w-lg', isAssistant ? 'items-start' : 'items-end', 'flex flex-col gap-2')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
            isAssistant
              ? 'bg-[#111] border border-[#1f1f1f] text-white rounded-tl-sm'
              : 'bg-[#D4AF37] text-black font-medium rounded-tr-sm'
          )}
        >
          {message.content}
        </div>

        {message.buttons && message.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.buttons.map((btn, i) => (
              <Button
                key={i}
                variant={btn.primary ? 'primary' : 'secondary'}
                size="sm"
                href={btn.url}
                onClick={btn.action ? () => { /* action handler: implement as needed */ } : undefined}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
