-- Audit logs are append-only.
--  * UPDATE is rejected, except the FK action that nulls actor_id when a user row is deleted.
--  * DELETE is only allowed inside a retention job that runs: SET LOCAL app.audit_retention = 'on'
CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.actor_id IS NOT NULL AND NEW.actor_id IS NULL
       AND (NEW.id, NEW.actor_label, NEW.action, NEW.entity_type, NEW.entity_id, NEW.metadata,
            NEW.ip_address, NEW.user_agent, NEW.created_at)
       IS NOT DISTINCT FROM
           (OLD.id, OLD.actor_label, OLD.action, OLD.entity_type, OLD.entity_id, OLD.metadata,
            OLD.ip_address, OLD.user_agent, OLD.created_at) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'audit_logs is append-only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF coalesce(current_setting('app.audit_retention', true), '') <> 'on' THEN
    RAISE EXCEPTION 'audit_logs rows can only be deleted by the retention job'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_guard
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_guard();
