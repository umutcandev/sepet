"use client"

import * as React from "react"
import { ChevronDownIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ConversationDeleteDialog,
  ConversationRenameDialog,
  type ConversationTarget,
} from "@/components/assistant/conversation-action-dialogs"

type Props = {
  conversationId: string
  title: string
}

export function AssistantHeaderActions({ conversationId, title }: Props) {
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const target: ConversationTarget = { id: conversationId, title }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-1 size-6 text-muted-foreground hover:text-foreground"
            aria-label="Sohbet eylemleri"
          >
            <ChevronDownIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto min-w-40">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setRenameOpen(true)
            }}
          >
            <PencilIcon className="mr-2 size-4" />
            Yeniden adlandır
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setDeleteOpen(true)
            }}
          >
            <Trash2Icon className="mr-2 size-4" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConversationRenameDialog
        target={renameOpen ? target : null}
        onClose={() => setRenameOpen(false)}
      />
      <ConversationDeleteDialog
        target={deleteOpen ? target : null}
        activeId={conversationId}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
