import { pool } from "@/db";
import type { SessionUser } from "@/lib/auth";

export async function listContactPool(user: SessionUser) {
  const admin = user.role === "admin";
  const result = await pool.query<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    region: string | null;
    topic: string | null;
    preferred_channel: string | null;
    preferred_time: string | null;
    note: string;
    tags: string[];
    status: string;
    owner_employee_id: number | null;
    owner_name: string | null;
    next_contact_at: Date | null;
    converted_lead_id: number | null;
    created_at: Date;
    updated_at: Date;
    products: Array<{ id: number; name: string; provider: string; relation: string }>;
  }>(
    `select c.id,c.name,c.email,c.phone,c.region,c.topic,c.preferred_channel,c.preferred_time,c.note,c.tags,c.status,
      c.owner_employee_id,e.name as owner_name,c.next_contact_at,c.converted_lead_id,c.created_at,c.updated_at,
      coalesce(json_agg(json_build_object('id',p.id,'name',p.name,'provider',pr.name,'relation',l.relation) order by p.name)
        filter (where p.id is not null),'[]'::json) as products
     from prospect_contacts c
     left join employees e on e.id=c.owner_employee_id
     left join prospect_contact_product_links l on l.contact_id=c.id
     left join products p on p.id=l.product_id
     left join providers pr on pr.id=p.provider_id
     where c.status <> 'archived' ${admin ? "" : "and (c.owner_employee_id=$1 or c.created_by_employee_id=$1)"}
     group by c.id,e.name
     order by case c.status when 'parked' then 0 when 'contacted' then 1 when 'qualified' then 2 when 'converted' then 3 else 4 end,
       c.next_contact_at nulls last,c.updated_at desc
     limit 500`,
    admin ? [] : [user.id],
  );
  return result.rows;
}
