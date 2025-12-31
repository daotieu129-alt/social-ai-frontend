// src/modules/customers/CustomersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import clsx from "clsx";
import { useSearchParams, useNavigate } from "react-router-dom";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  gender: "",
  initialNote: "",
};

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Aura({ className }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]", className)}>
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-500/18 blur-3xl" />
      <div className="absolute top-8 right-8 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl" />
      <div className="absolute -bottom-36 -right-36 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(closest-side,rgba(255,255,255,0.05),transparent)] opacity-45" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
    </div>
  );
}

function GlassCard({ title, subtitle, right, children, className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[30px] border border-slate-800/70",
        "bg-gradient-to-b from-slate-950/85 to-slate-950/45",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_30px_90px_rgba(0,0,0,0.48)]",
        className
      )}
    >
      <Aura className="rounded-[30px]" />
      <div className="relative rounded-[30px] p-[1px] bg-gradient-to-r from-violet-500/16 via-cyan-500/10 to-emerald-500/12">
        <div className="rounded-[29px] bg-slate-950/35">
          {(title || right || subtitle) && (
            <div className="border-b border-slate-800/60 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {title ? <div className="text-base font-semibold text-slate-100">{title}</div> : null}
                  {subtitle ? <div className="mt-1 text-xs text-slate-400">{subtitle}</div> : null}
                </div>
                {right}
              </div>
            </div>
          )}
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Badge({ tone = "neutral", children, className }) {
  const t = {
    neutral: "border-slate-800 bg-slate-950/35 text-slate-200",
    info: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    ok: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100",
    warn: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    rose: "border-rose-400/25 bg-rose-500/12 text-rose-100",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", t[tone] || t.neutral, className)}>
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", className, onClick, disabled, children, type = "button", title }) {
  const t = {
    neutral: "border-slate-800 bg-slate-950/35 text-slate-200 hover:bg-slate-900/45 hover:border-slate-700/80",
    indigo:
      "border-violet-400/22 bg-gradient-to-r from-violet-500/24 via-cyan-500/12 to-emerald-500/10 text-white hover:brightness-110",
    danger: "border-rose-400/22 bg-rose-500/10 text-rose-100 hover:bg-rose-500/14",
    ghost: "border-transparent bg-transparent text-slate-300 hover:bg-slate-900/45 hover:text-slate-100",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
        t[tone] || t.neutral,
        disabled && "cursor-not-allowed opacity-60 hover:brightness-100",
        className
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold text-slate-400">{label}</div>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text", name }) {
  return (
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none",
        "focus:border-violet-400/25 focus:ring-2 focus:ring-violet-500/10"
      )}
    />
  );
}

function Select({ value, onChange, name, children }) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={cn(
        "w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 outline-none",
        "focus:border-violet-400/25 focus:ring-2 focus:ring-violet-500/10"
      )}
    >
      {children}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 2, name }) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "w-full rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none",
        "focus:border-violet-400/25 focus:ring-2 focus:ring-violet-500/10"
      )}
    />
  );
}

function MiniCard({ icon, title, desc }) {
  return (
    <div className="rounded-[22px] border border-slate-800/70 bg-slate-950/25 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 text-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100">{title}</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-400">{desc}</div>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage({ activeShop }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusId = searchParams.get("focus") || "";
  const refsById = useRef({});

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const [notesByCustomer, setNotesByCustomer] = useState({});
  const [notesLoading, setNotesLoading] = useState({});
  const [noteInput, setNoteInput] = useState({});
  const [noteSaving, setNoteSaving] = useState({});
  const [noteError, setNoteError] = useState({});
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  useEffect(() => {
    if (!activeShop) return;
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShop?.id]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/customers", { params: { shop_id: activeShop.id } });
      const data = res.data?.data ?? res.data;
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Không tải được danh sách khách hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!focusId) return;
    if (loading) return;
    const target = customers.find((c) => String(c.id) === String(focusId));
    if (!target) return;

    setExpandedCustomerId(target.id);
    if (!notesByCustomer[target.id]) loadNotes(target.id);

    const el = refsById.current[target.id];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("focus");
      setSearchParams(next, { replace: true });
    }, 1500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading, customers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      gender: customer.gender || "",
      initialNote: "",
    });
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeShop) return;

    if (!form.name && !form.phone && !form.email) {
      setError("Ít nhất phải nhập tên, số điện thoại hoặc email.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      shop_id: activeShop.id,
      name: form.name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      gender: form.gender || null,
    };

    try {
      if (editingId) {
        const res = await api.patch(`/customers/${editingId}`, payload);
        const updated = res.data?.data ?? res.data;
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const res = await api.post("/customers", payload);
        const created = res.data?.data ?? res.data;
        setCustomers((prev) => [created, ...prev]);

        if (form.initialNote.trim()) {
          try {
            await api.post("/customer-notes", { customer_id: created.id, note: form.initialNote.trim() });
          } catch (noteErr) {
            console.error("Error creating initial note:", noteErr);
          }
        }
      }
      resetForm();
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Không lưu được khách hàng. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xoá khách hàng này?")) return;
    try {
      await api.delete(`/customers/${id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setNotesByCustomer((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error(err);
      alert("Xoá thất bại. Vui lòng thử lại.");
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const getInitial = (c) => {
    if (c.name && c.name.trim().length > 0) return c.name.trim()[0].toUpperCase();
    if (c.email && c.email.trim().length > 0) return c.email.trim()[0].toUpperCase();
    if (c.phone && c.phone.trim().length > 0) return c.phone.trim()[0].toUpperCase();
    return "?";
  };

  const genderLabel = (g) => {
    if (!g) return "Không rõ";
    if (g === "male") return "Nam";
    if (g === "female") return "Nữ";
    return "Khác";
  };

  const genderTone = (g) => {
    if (g === "male") return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
    if (g === "female") return "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100";
    if (g) return "border-emerald-400/25 bg-emerald-500/12 text-emerald-100";
    return "border-slate-800 bg-slate-950/35 text-slate-200";
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const loadNotes = async (customerId) => {
    try {
      setNotesLoading((prev) => ({ ...prev, [customerId]: true }));
      setNoteError((prev) => ({ ...prev, [customerId]: "" }));

      const res = await api.get("/customer-notes", { params: { customer_id: customerId } });
      const data = res.data?.data ?? res.data;
      setNotesByCustomer((prev) => ({ ...prev, [customerId]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      console.error(err);
      setNoteError((prev) => ({ ...prev, [customerId]: "Không tải được ghi chú." }));
    } finally {
      setNotesLoading((prev) => ({ ...prev, [customerId]: false }));
    }
  };

  const toggleTimeline = (customerId) => {
    setExpandedCustomerId((current) => (current === customerId ? null : customerId));
    if (!notesByCustomer[customerId]) loadNotes(customerId);
  };

  const handleNoteInputChange = (customerId, value) => {
    setNoteInput((prev) => ({ ...prev, [customerId]: value }));
  };

  const addNote = async (customerId) => {
    const text = (noteInput[customerId] || "").trim();
    if (!text) return;

    try {
      setNoteSaving((prev) => ({ ...prev, [customerId]: true }));
      setNoteError((prev) => ({ ...prev, [customerId]: "" }));

      const res = await api.post("/customer-notes", { customer_id: customerId, note: text });
      const created = res.data?.data ?? res.data;

      setNotesByCustomer((prev) => ({
        ...prev,
        [customerId]: [created, ...(prev[customerId] || [])],
      }));
      setNoteInput((prev) => ({ ...prev, [customerId]: "" }));
    } catch (err) {
      console.error(err);
      setNoteError((prev) => ({ ...prev, [customerId]: "Không tạo được ghi chú. Vui lòng thử lại." }));
    } finally {
      setNoteSaving((prev) => ({ ...prev, [customerId]: false }));
    }
  };

  const deleteNote = async (customerId, noteId) => {
    if (!window.confirm("Xoá ghi chú này?")) return;
    try {
      await api.delete(`/customer-notes/${noteId}`);
      setNotesByCustomer((prev) => ({
        ...prev,
        [customerId]: prev[customerId]?.filter((n) => n.id !== noteId) || [],
      }));
    } catch (err) {
      console.error(err);
      alert("Không xoá được ghi chú. Vui lòng thử lại.");
    }
  };

  if (!activeShop) {
    return (
      <GlassCard title="Khách hàng" subtitle="Cần chọn shop trước khi xem khách hàng.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warn">Action required</Badge>
          <Btn tone="indigo" onClick={() => navigate("/shops")}>
            Đi tới Shops
          </Btn>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <GlassCard
        title="Khách hàng"
        subtitle={
          <>
            Shop: <span className="font-semibold text-slate-200">{activeShop.name}</span> • Lưu khách để AI cá nhân hoá nội dung & chăm sóc lại.
          </>
        }
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">
              Tổng: <span className="ml-1 text-slate-100 font-semibold">{customers.length}</span>
            </Badge>
            <Btn tone="indigo" onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? "Đóng form" : "+ Thêm khách hàng"}
            </Btn>
            <Btn tone="neutral" onClick={loadCustomers} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Btn>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <MiniCard icon="💡" title="Gợi ý" desc="Thêm ghi chú nhu cầu/objection/hẹn gọi lại để tối ưu kịch bản chăm sóc và nội dung AI." />
          <MiniCard icon="🏷️" title="Tags" desc="Có thể gắn tag (fb_psid/page) từ Inbox khi tính năng Messaging được mở." />
        </div>
      </GlassCard>

      {formOpen ? (
        <GlassCard
          title={editingId ? "Sửa khách hàng" : "Thêm khách hàng mới"}
          subtitle="Ít nhất nên nhập tên hoặc SĐT hoặc email."
          right={
            <div className="flex items-center gap-2">
              {editingId ? (
                <Btn
                  tone="neutral"
                  onClick={() => {
                    resetForm();
                    setFormOpen(false);
                  }}
                >
                  Huỷ sửa
                </Btn>
              ) : null}
            </div>
          }
        >
          {error ? (
            <div className="mb-3 rounded-2xl border border-rose-500/22 bg-rose-500/08 px-3 py-2 text-xs text-rose-100">{error}</div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Tên">
                <Input name="name" value={form.name} onChange={handleChange} placeholder="VD: Nguyễn Văn A" />
              </Field>
              <Field label="Giới tính">
                <Select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Không rõ</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Số điện thoại">
                <Input name="phone" value={form.phone} onChange={handleChange} placeholder="VD: 09xx xxx xxx" />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="VD: khach@example.com" />
              </Field>
            </div>

            {!editingId ? (
              <Field label="Ghi chú ban đầu">
                <Textarea name="initialNote" value={form.initialNote} onChange={handleChange} rows={2} placeholder="VD: khách VIP, thích son kem, hẹn gọi lại…" />
              </Field>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Btn
                tone="neutral"
                type="button"
                onClick={() => {
                  resetForm();
                  setFormOpen(false);
                }}
              >
                Đóng
              </Btn>
              <Btn tone="indigo" type="submit" disabled={saving}>
                {saving ? "Đang lưu…" : editingId ? "Lưu thay đổi" : "Thêm khách hàng"}
              </Btn>
            </div>
          </form>
        </GlassCard>
      ) : null}

      <GlassCard
        title="Danh sách khách hàng"
        subtitle="Tìm theo tên/SĐT/email. Mở ghi chú để xem lịch sử và thêm note."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, SĐT, email…" />
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-slate-400">Đang tải danh sách khách hàng…</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-[24px] border border-slate-800/70 bg-slate-950/25 p-5">
            <div className="text-sm font-semibold text-slate-100">Chưa có khách hàng</div>
            <div className="mt-1 text-xs text-slate-400">Bấm “+ Thêm khách hàng” để tạo khách đầu tiên.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCustomers.map((c) => {
              const isExpanded = expandedCustomerId === c.id;
              const customerNotes = notesByCustomer[c.id] || [];
              const isNotesLoading = notesLoading[c.id];
              const addNoteSaving = noteSaving[c.id];
              const noteErr = noteError[c.id];

              const isFocused = focusId && String(c.id) === String(focusId);

              return (
                <div
                  key={c.id}
                  ref={(el) => {
                    refsById.current[c.id] = el;
                  }}
                  className={clsx(
                    "rounded-[26px] border p-4",
                    isFocused
                      ? "border-violet-400/35 bg-violet-500/06 shadow-[0_0_0_2px_rgba(99,102,241,0.10)]"
                      : "border-slate-800/70 bg-slate-950/25"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-950/35 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-100">
                      {getInitial(c)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">{c.name || "(Chưa đặt tên)"}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {c.phone ? <Badge tone="neutral">📞 {c.phone}</Badge> : null}
                            {c.email ? <Badge tone="neutral">✉️ {c.email}</Badge> : null}
                            <Badge className="capitalize" tone={genderTone(c.gender)}>
                              {genderLabel(c.gender)}
                            </Badge>
                            {Array.isArray(c.tags) && c.tags.length ? (
                              <Badge tone="info">🏷️ {c.tags.slice(0, 2).join(", ")}</Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Btn tone="neutral" onClick={() => handleEdit(c)}>
                            Sửa
                          </Btn>
                          <Btn tone="danger" onClick={() => deleteCustomer(c.id)}>
                            Xoá
                          </Btn>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <Btn tone="ghost" onClick={() => toggleTimeline(c.id)}>
                          {isExpanded ? "Ẩn ghi chú" : "Ghi chú"}
                        </Btn>
                        <Badge tone="neutral">{customerNotes.length} note</Badge>
                      </div>

                      {isExpanded ? (
                        <div className="mt-3 border-t border-slate-800/60 pt-3 space-y-2">
                          <div className="flex items-end gap-2">
                            <Textarea
                              rows={2}
                              value={noteInput[c.id] || ""}
                              onChange={(e) => handleNoteInputChange(c.id, e.target.value)}
                              placeholder="Thêm ghi chú: nhu cầu, objection, hẹn gọi lại…"
                            />
                            <Btn tone="indigo" onClick={() => addNote(c.id)} disabled={addNoteSaving}>
                              {addNoteSaving ? "Đang lưu…" : "Thêm"}
                            </Btn>
                          </div>

                          {noteErr ? (
                            <div className="rounded-2xl border border-rose-500/22 bg-rose-500/08 px-3 py-2 text-xs text-rose-100">{noteErr}</div>
                          ) : null}

                          {isNotesLoading ? (
                            <div className="text-xs text-slate-400">Đang tải ghi chú…</div>
                          ) : customerNotes.length === 0 ? (
                            <div className="text-xs text-slate-400">Chưa có ghi chú nào.</div>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-auto pr-1">
                              {customerNotes.map((n) => (
                                <div key={n.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/25 p-3">
                                  <div className="text-xs text-slate-200 whitespace-pre-wrap">{n.note}</div>
                                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                    <span>{formatDateTime(n.created_at)}</span>
                                    <Btn tone="ghost" className="text-rose-200 hover:text-rose-100" onClick={() => deleteNote(c.id, n.id)}>
                                      Xoá
                                    </Btn>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
