import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Member = {
  id: string;
  name: string;
  email: string;
  app_roles: string[];
  active: boolean;
  instrument_role_names: string[];
};

export function MembersTable({ members }: { members: Member[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>App Roles</TableHead>
          <TableHead>Instruments</TableHead>
          <TableHead>Active</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => (
          <TableRow key={m.id}>
            <TableCell>{m.name || "—"}</TableCell>
            <TableCell>{m.email}</TableCell>
            <TableCell className="space-x-1">
              {m.app_roles.map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {m.instrument_role_names.join(", ") || "—"}
            </TableCell>
            <TableCell>{m.active ? "Yes" : "No"}</TableCell>
            <TableCell>
              <Link className="text-sm underline" href={`/admin/members/${m.id}`}>
                Edit
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
