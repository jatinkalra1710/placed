-- ============================================================
-- Thapar Placed — replaces the "welcome email on approve" trigger
-- with one that sends a (different) email on BOTH approve and
-- reject. Run once in Supabase SQL Editor, AFTER you've already
-- run automated_welcome_email.sql (or fix_welcome_email_failsafe.sql)
-- at least once — this migration builds on that setup.
--
-- Before running: fill in your sender email + site URL, same as
-- you did in the earlier welcome-email file.
-- ============================================================

drop trigger if exists on_verification_approved on public.verifications;
drop trigger if exists on_verification_status_change on public.verifications;

create or replace function public.send_verification_status_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text;
  v_name text;
  v_city_name text;
  v_api_key text;
  v_html text;
  v_subject text;
begin
  -- only fire on a genuine transition into approved or rejected
  if NEW.status not in ('approved', 'rejected') or OLD.status = NEW.status then
    return NEW;
  end if;

  begin
    select email, coalesce(nullif(full_name, ''), 'batchmate')
    into v_email, v_name
    from public.profiles
    where id = NEW.user_id;

    v_city_name := case NEW.city
      when 'chandigarh' then 'Chandigarh'
      when 'delhi_ncr' then 'Delhi NCR (Noida / Gurgaon)'
      when 'pune' then 'Pune'
      when 'bangalore' then 'Bangalore'
      when 'hyderabad' then 'Hyderabad'
      when 'kolkata' then 'Kolkata'
      when 'chennai' then 'Chennai'
      when 'mumbai' then 'Mumbai'
      else NEW.city::text
    end;

    select decrypted_secret into v_api_key
    from vault.decrypted_secrets
    where name = 'brevo_api_key';

    if v_api_key is null then
      raise warning 'send_verification_status_email: brevo_api_key not set, skipping';
      return NEW;
    end if;

    if NEW.status = 'approved' then
      v_subject := 'Welcome aboard, ' || v_name || ' — your ' || v_city_name || ' gate is open 🎉';
      v_html := replace(replace(replace(replace(
        '<!doctype html><html><body style="margin:0;padding:0;background:#12151C;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#12151C;padding:32px 0;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#1D2230;border-radius:12px;overflow:hidden;"><tr><td style="padding:32px 32px 8px;"><p style="margin:0;color:#E8A33D;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:monospace;">TIET 2027 Community</p><h1 style="margin:12px 0 0;color:#F5F2EA;font-size:24px;line-height:1.3;">Congratulations, {{full_name}}! 🎉</h1></td></tr><tr><td style="padding:16px 32px 0;"><p style="margin:0;color:#C9CEDA;font-size:15px;line-height:1.6;">Your offer at <strong style="color:#F5F2EA;">{{company_name}}</strong> is verified, and your <strong style="color:#F5F2EA;">{{city_name}}</strong> gate is now open.</p><p style="margin:16px 0 0;color:#C9CEDA;font-size:15px;line-height:1.6;">You''ve got access to your city''s directory, live chatroom, the flat & roommate board, and messaging with the rest of the batch — wherever they''re headed.</p></td></tr><tr><td style="padding:28px 32px 8px;"><a href="{{dashboard_url}}" style="display:inline-block;background:#E8A33D;color:#12151C;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:6px;text-decoration:none;">Open your board →</a></td></tr><tr><td style="padding:16px 32px 28px;border-top:1px solid #2A3040;"><p style="margin:0;color:#6B7280;font-size:11px;font-family:monospace;">Made with ♥ by TIET 2027 Community</p></td></tr></table></td></tr></table></body></html>',
        '{{full_name}}', v_name),
        '{{company_name}}', NEW.company_name),
        '{{city_name}}', v_city_name),
        '{{dashboard_url}}', 'https://YOUR-APP.vercel.app/dashboard/' || NEW.city::text
      );
    else
      v_subject := 'About your Thapar Placed submission';
      v_html := replace(replace(
        '<!doctype html><html><body style="margin:0;padding:0;background:#12151C;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#12151C;padding:32px 0;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#1D2230;border-radius:12px;overflow:hidden;"><tr><td style="padding:32px 32px 8px;"><p style="margin:0;color:#C0533E;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:monospace;">TIET 2027 Community</p><h1 style="margin:12px 0 0;color:#F5F2EA;font-size:22px;line-height:1.3;">Hey {{full_name}}, one thing before you''re in</h1></td></tr><tr><td style="padding:16px 32px 0;"><p style="margin:0;color:#C9CEDA;font-size:15px;line-height:1.6;">We couldn''t verify your last submission. Here''s the note from your admin:</p><p style="margin:14px 0 0;padding:12px 14px;background:#12151C;border-radius:6px;color:#F5F2EA;font-size:14px;line-height:1.5;">{{review_note}}</p><p style="margin:16px 0 0;color:#C9CEDA;font-size:15px;line-height:1.6;">No worries — just head back and resubmit whenever you''re ready.</p></td></tr><tr><td style="padding:28px 32px 8px;"><a href="{{onboarding_url}}" style="display:inline-block;background:#E8A33D;color:#12151C;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:6px;text-decoration:none;">Resubmit →</a></td></tr><tr><td style="padding:16px 32px 28px;border-top:1px solid #2A3040;"><p style="margin:0;color:#6B7280;font-size:11px;font-family:monospace;">Made with ♥ by TIET 2027 Community</p></td></tr></table></td></tr></table></body></html>',
        '{{full_name}}', v_name),
        '{{review_note}}', coalesce(nullif(NEW.review_note, ''), 'No specific reason was given — a clearer screenshot usually does it.')
      );
      v_html := replace(v_html, '{{onboarding_url}}', 'https://YOUR-APP.vercel.app/onboarding');
    end if;

    perform net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object(
        'api-key', v_api_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'sender', jsonb_build_object('name', 'TIET 2027 Community', 'email', 'YOUR_VERIFIED_SENDER@example.com'),
        'to', jsonb_build_array(jsonb_build_object('email', v_email, 'name', v_name)),
        'subject', v_subject,
        'htmlContent', v_html
      )
    );
  exception when others then
    raise warning 'send_verification_status_email failed (status change still succeeded): %', SQLERRM;
  end;

  return NEW;
end;
$$;

create trigger on_verification_status_change
  after update on public.verifications
  for each row
  execute procedure public.send_verification_status_email();
