"use client";

import { Eye, Edit2, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { canManageRecord } from "@/lib/permissions";
import { t } from "@/lib/translations";
import type { Language } from "@/lib/translations";

interface RecordActionsMenuProps {
  recordOwnerId: string | null | undefined;
  language: Language;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RecordActionsMenu({
  recordOwnerId,
  language,
  onView,
  onEdit,
  onDelete,
}: RecordActionsMenuProps) {
  const { user } = useAuth();
  const canManage = canManageRecord(user, recordOwnerId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
          {t("Options", language)} <ChevronDown className="ml-1.5 w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("Actions", language)}</DropdownMenuLabel>
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 w-4 h-4" />
          {t("View Details", language)}
        </DropdownMenuItem>
        {canManage && onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="mr-2 w-4 h-4" />
            {t("Edit", language)}
          </DropdownMenuItem>
        )}
        {canManage && onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 w-4 h-4" />
            {t("Delete", language)}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
