"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRightIcon, ChevronDownIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { getAuthors, type AuthorId } from "@/lib/blog/authors"
import { cn } from "@/lib/utils"

// Sidebar'da listelenen yazılar için hafif şekil — ağır Post alanları
// (content/raw/toc) istemciye taşınmaz, yalnız başlık + link + yazar(lar) gelir.
export type BlogNavItem = {
  title: string
  permalink: string
  authors: AuthorId[]
}

type Props = {
  posts: BlogNavItem[]
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

// Başlığın önünde, tam metin boyutunda (size-4 ≈ text-sm satırı) yazar avatarı;
// eş-yazarda hafif üst üste binen AvatarGroup.
function PostAuthorAvatars({ authors }: { authors: readonly AuthorId[] }) {
  const list = getAuthors(authors)
  return (
    <AvatarGroup className="-space-x-1 *:data-[slot=avatar]:ring-[1.5px]">
      {list.map((author) => (
        <Avatar key={author.name} className="size-4">
          {author.avatar ? (
            <AvatarImage src={author.avatar} alt={author.name} />
          ) : null}
          <AvatarFallback className="text-[8px] leading-none">
            {initials(author.name)}
          </AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  )
}

function PostRow({
  post,
  onNavigate,
}: {
  post: BlogNavItem
  onNavigate: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <SidebarMenuItem
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <SidebarMenuButton asChild tooltip={post.title}>
        <Link href={post.permalink} onClick={onNavigate}>
          <PostAuthorAvatars authors={post.authors} />
          <span className="min-w-0 flex-1 truncate">{post.title}</span>
          <motion.span
            aria-hidden
            className="flex shrink-0 items-center text-muted-foreground"
            initial={false}
            animate={hovered ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <ArrowRightIcon className="size-3.5!" />
          </motion.span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * Sidebar "Blog Gönderileri" grubu. Favoriler / Geçmiş Sohbetler gruplarıyla
 * aynı açılır-kapanır (collapsible) davranışı kullanır; varsayılan açık gelir.
 * Son birkaç yazının başlığını yazar avatarıyla gösterir, altta "Tüm yazıları
 * gör" satırıyla /blog'a yönlendirir.
 */
export function BlogPostsGroup({ posts }: Props) {
  const { isMobile, setOpenMobile } = useSidebar()
  const [collapsed, setCollapsed] = React.useState(false)

  const handleNavClick = React.useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  if (posts.length === 0) return null

  return (
    <SidebarGroup className="shrink-0">
      <SidebarGroupLabel asChild>
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="flex w-full items-center justify-start text-left cursor-pointer"
        >
          <span className="inline-flex items-center gap-1.5 w-fit hover:text-sidebar-foreground transition-colors [&:hover>svg]:opacity-100">
            <span>Blog Gönderileri</span>
            <ChevronDownIcon
              className={cn(
                "size-3.5 opacity-0 transition-all duration-200",
                collapsed && "-rotate-90"
              )}
            />
          </span>
        </button>
      </SidebarGroupLabel>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <SidebarGroupContent>
            <SidebarMenu>
              {posts.map((post, i) => (
                <motion.div
                  key={post.permalink}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1, delay: i * 0.008 }}
                >
                  <PostRow post={post} onNavigate={handleNavClick} />
                </motion.div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        )}
      </AnimatePresence>
    </SidebarGroup>
  )
}
