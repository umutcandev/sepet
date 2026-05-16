"use client"

import * as React from "react"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"

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
            variant="outline"
            size="icon"
            className="size-7"
            aria-label="Sohbet eylemleri"
          >
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
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
