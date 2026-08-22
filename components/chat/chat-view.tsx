"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, parseErrorBody } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  imagePath: string | null;
  localImageUrl?: string;
  pending?: boolean;
}

export function ChatView({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function clearImage() {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && !image) return;

    setSending(true);
    setError(null);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "user",
        content: trimmed || "(imagen)",
        imagePath: image ? "pending" : null,
        localImageUrl: imagePreview ?? undefined,
        pending: true,
      },
    ]);

    const formData = new FormData();
    formData.append("text", trimmed);
    if (image) formData.append("image", image);

    setText("");
    clearImage();

    const res = await fetch("/api/chat/messages", { method: "POST", body: formData });

    if (!res.ok) {
      setError(await parseErrorBody(res, "No se pudo enviar el mensaje."));
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSending(false);
      return;
    }

    const { userMessage, assistantMessage } = await res.json();
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== tempId),
      { id: userMessage.id, role: "user", content: userMessage.content, imagePath: userMessage.imagePath },
      { id: assistantMessage.id, role: "model", content: assistantMessage.content, imagePath: null },
    ]);
    setSending(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Sparkles className="h-8 w-8 text-primary" />
            <p>
              Pregúntame lo que quieras sobre alimentos y dietas, o mándame una foto de un producto
              o un ingrediente.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] space-y-2 rounded-2xl px-3 py-2 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
                message.pending && "opacity-70",
              )}
            >
              {(message.localImageUrl || (message.imagePath && !message.pending)) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.localImageUrl ?? `/api/chat/images/${message.id}`}
                  alt="Imagen enviada"
                  className="max-h-48 w-full rounded-lg object-cover"
                />
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
              Escribiendo…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}

      <div className="border-t bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {imagePreview && (
          <div className="relative mb-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Vista previa" className="h-16 w-16 rounded-md object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5 text-background"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={handleImagePick}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="sr-only">Adjuntar imagen</span>
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe tu pregunta…"
            rows={1}
            className="max-h-32 flex-1 resize-none"
            disabled={sending}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0"
            onClick={handleSend}
            disabled={sending || (!text.trim() && !image)}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
