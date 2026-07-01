import * as React from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar"
import { getAuthors, type AuthorId } from "@/lib/blog/authors"
import { cn } from "@/lib/utils"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

/** Üst üste binen yazar avatarları (eş-yazarda AvatarGroup). */
export function AuthorAvatarGroup({
  authors,
  size = "sm",
}: {
  authors: readonly AuthorId[]
  size?: "sm" | "default" | "lg"
}) {
  const list = getAuthors(authors)
  return (
    <AvatarGroup>
      {list.map((author) => (
        <Avatar key={author.name} size={size}>
          {author.avatar ? (
            <AvatarImage src={author.avatar} alt={author.name} />
          ) : null}
          <AvatarFallback>{initials(author.name)}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  )
}

/**
 * Yazar adları; her biri doğrudan X profiline gider (rel="author", yeni sekme).
 * Eş-yazarda "X ve Y" biçiminde ayraçla.
 */
export function AuthorNameLinks({
  authors,
  className,
}: {
  authors: readonly AuthorId[]
  className?: string
}) {
  const list = getAuthors(authors)
  return (
    <span className={cn("text-foreground", className)}>
      {list.map((author, index) => (
        <React.Fragment key={author.x + author.name}>
          {index > 0 ? (
            <span className="text-muted-foreground">
              {index === list.length - 1 ? " ve " : ", "}
            </span>
          ) : null}
          <a
            href={author.x}
            target="_blank"
            rel="author noopener noreferrer"
            className="font-medium underline-offset-2 transition-colors hover:text-primary hover:underline"
          >
            {author.name}
          </a>
        </React.Fragment>
      ))}
    </span>
  )
}
