import "react-native-url-polyfill/auto";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase } from "./src/lib/supabase";
import { apiFetch } from "./src/lib/api";

type Screen =
  | "bills"
  | "customers"
  | "templates"
  | "sent-bills"
  | "reports"
  | "settings";

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type Bill = {
  id: string;
  amount_cents: number;
  balance_cents: number;
  due_date: string;
  description?: string;
  status: string;
  customers?: { name?: string | null } | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  total_cents: number;
  status: string;
  issued_at: string;
  customers?: { name?: string | null } | null;
};

type Template = {
  id: string;
  name: string;
  description?: string | null;
  amount_cents: number;
};

type PhotoAsset = { uri: string; mimeType?: string };

const MENU_ITEMS: { key: Screen; label: string }[] = [
  { key: "bills", label: "Bills" },
  { key: "customers", label: "Customers" },
  { key: "templates", label: "Templates" },
  { key: "sent-bills", label: "Sent bills" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
];

export default function App() {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<Screen>("bills");

  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [business, setBusiness] = useState<{ name?: string } | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);

  const [showNewBill, setShowNewBill] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);
  const [creating, setCreating] = useState(false);

  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress1, setNewCustomerAddress1] = useState("");
  const [newCustomerAddress2, setNewCustomerAddress2] = useState("");
  const [newCustomerCity, setNewCustomerCity] = useState("");
  const [newCustomerState, setNewCustomerState] = useState("");
  const [newCustomerPostal, setNewCustomerPostal] = useState("");
  const [newCustomerSmsConsent, setNewCustomerSmsConsent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s as { access_token: string } | null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s as { access_token: string } | null);
      if (!s) {
        setBills([]);
        setCustomers([]);
        setTemplates([]);
        setInvoices([]);
        setBusiness(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Lazy-load data per screen to avoid timeouts from multiple parallel requests
  useEffect(() => {
    if (!session) return;
    if (activeScreen === "bills") {
      loadBills();
      loadCustomers(); // needed for New bill customer picker
    }
    if (activeScreen === "customers") loadCustomers();
    if (activeScreen === "templates") loadTemplates();
    if (activeScreen === "sent-bills") loadInvoices();
    if (activeScreen === "settings") loadBusiness();
  }, [session, activeScreen]);

  const loadBills = () => {
    setBillsLoading(true);
    apiFetch("/api/bills")
      .then((r) => r.json())
      .then((d) => setBills(d.bills || []))
      .catch(() => setBills([]))
      .finally(() => setBillsLoading(false));
  };

  const loadCustomers = () => {
    setCustomersLoading(true);
    apiFetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        const list: Customer[] = d.customers || [];
        setCustomers(list);
        if (list.length === 1 && !selectedCustomerId) setSelectedCustomerId(list[0].id);
      })
      .catch(() => setCustomers([]))
      .finally(() => setCustomersLoading(false));
  };

  const loadTemplates = () => {
    setTemplatesLoading(true);
    apiFetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  };

  const loadInvoices = () => {
    setInvoicesLoading(true);
    apiFetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices || []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  };

  const loadBusiness = () => {
    setBusinessLoading(true);
    apiFetch("/api/business")
      .then((r) => r.json())
      .then((d) => setBusiness(d.business || null))
      .catch(() => setBusiness(null))
      .finally(() => setBusinessLoading(false));
  };

  const downloadReport = async (report: "bills" | "send-history") => {
    try {
      const res = await apiFetch(`/api/reports/${report}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const text = await res.text();
      const path = `${FileSystem.cacheDirectory}report-${report}.csv`;
      await FileSystem.writeAsStringAsync(path, text, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(path, { mimeType: "text/csv" });
      else Alert.alert("Saved", `Report saved to cache.`);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not download report.");
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Enter email and password.");
      return;
    }
    setSigningIn(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSigningIn(false);
    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }
    setSession(data.session as { access_token: string });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const formatMoney = (c: number) =>
    "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera permission", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType ?? "image/jpeg" });
    }
  };

  const handleCreateBill = async () => {
    if (!selectedCustomerId) {
      Alert.alert("Missing info", "Select a customer.");
      return;
    }
    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (amountCents <= 0) {
      Alert.alert("Missing info", "Enter an amount greater than 0.");
      return;
    }
    setCreating(true);
    try {
      const billRes = await apiFetch("/api/bills", {
        method: "POST",
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          amount_cents: amountCents,
          description: description.trim() || "Invoice",
          due_date: dueDate,
        }),
      });
      const billData = await billRes.json();
      if (!billRes.ok) throw new Error(billData.error || "Failed to create bill");
      const billId = billData.bill?.id;
      if (billId && photo) {
        const formData = new FormData();
        formData.append("file", { uri: photo.uri, name: "photo.jpg", type: photo.mimeType || "image/jpeg" } as any);
        const uploadRes = await apiFetch(`/api/bills/${billId}/attachment`, { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const ud = await uploadRes.json().catch(() => ({}));
          throw new Error(ud.error || "Photo upload failed");
        }
      }
      Alert.alert("Saved", "Bill created.");
      setAmount("");
      setDescription("");
      setPhoto(null);
      setDueDate(new Date().toISOString().slice(0, 10));
      setShowNewBill(false);
      loadBills();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert("Missing info", "Customer name is required.");
      return;
    }
    setCreatingCustomer(true);
    try {
      const res = await apiFetch("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: newCustomerName.trim(),
          email: newCustomerEmail.trim() || null,
          phone: newCustomerPhone.trim() || null,
          address_line1: newCustomerAddress1.trim() || null,
          address_line2: newCustomerAddress2.trim() || null,
          city: newCustomerCity.trim() || null,
          state: newCustomerState.trim() || null,
          postal_code: newCustomerPostal.trim() || null,
          sms_consent: newCustomerSmsConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      loadCustomers();
      const created = data.customer;
      if (created?.id) setSelectedCustomerId(created.id);
      setNewCustomerName("");
      setNewCustomerEmail("");
      setNewCustomerPhone("");
      setNewCustomerAddress1("");
      setNewCustomerAddress2("");
      setNewCustomerCity("");
      setNewCustomerState("");
      setNewCustomerPostal("");
      setNewCustomerSmsConsent(false);
      Alert.alert("Saved", "Customer added.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setCreatingCustomer(false);
    }
  };

  const goTo = (screen: Screen) => {
    setActiveScreen(screen);
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loginBox}>
          <Text style={styles.title}>BillPay Secure</Text>
          <Text style={styles.subtitle}>Sign in</Text>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94a3b8" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#94a3b8" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[styles.button, signingIn && styles.buttonDisabled]} onPress={handleSignIn} disabled={signingIn}>
            {signingIn ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const screenTitles: Record<Screen, string> = {
    bills: "Bills",
    customers: "Customers",
    templates: "Templates",
    "sent-bills": "Sent bills",
    reports: "Reports",
    settings: "Settings",
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{screenTitles[activeScreen]}</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuPanel}>
            <Text style={styles.menuTitle}>Menu</Text>
            {MENU_ITEMS.map(({ key, label }) => (
              <TouchableOpacity key={key} style={[styles.menuItem, activeScreen === key && styles.menuItemActive]} onPress={() => goTo(key)}>
                <Text style={[styles.menuItemText, activeScreen === key && styles.menuItemTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeScreen === "bills" && (
          <View style={styles.card}>
            {!showNewBill ? (
              <>
                <TouchableOpacity style={styles.button} onPress={() => setShowNewBill(true)}>
                  <Text style={styles.buttonText}>New bill</Text>
                </TouchableOpacity>
                {billsLoading ? (
                  <ActivityIndicator size="small" color="#059669" style={{ marginTop: 16 }} />
                ) : bills.length === 0 ? (
                  <Text style={styles.emptyText}>No bills yet.</Text>
                ) : (
                  bills.map((b) => (
                    <View key={b.id} style={styles.listRow}>
                      <Text style={styles.listTitle}>{b.customers?.name ?? "—"} · {formatMoney(b.balance_cents)}</Text>
                      <Text style={styles.listMeta}>{b.due_date} · {b.status}</Text>
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                <Text style={styles.cardLabel}>New bill</Text>
                <Text style={styles.fieldLabel}>Customer</Text>
                {customers.length === 0 ? (
                  <Text style={styles.emptyText}>Add a customer first.</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.select}
                    onPress={() => {
                      const idx = customers.findIndex((c) => c.id === selectedCustomerId);
                      const next = idx >= 0 && idx < customers.length - 1 ? customers[idx + 1] : customers[0];
                      setSelectedCustomerId(next.id);
                    }}
                  >
                    <Text style={styles.selectText}>{selectedCustomerId ? customers.find((c) => c.id === selectedCustomerId)?.name ?? "Select" : "Tap to pick"}</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.fieldLabel}>Amount ($)</Text>
                <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput style={styles.input} placeholder="Invoice" placeholderTextColor="#94a3b8" value={description} onChangeText={setDescription} />
                <Text style={styles.fieldLabel}>Due date</Text>
                <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholderTextColor="#94a3b8" />
                <Text style={styles.fieldLabel}>Job photo</Text>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
                  <Text style={styles.photoButtonText}>Add photo from camera</Text>
                </TouchableOpacity>
                {photo && <Image source={{ uri: photo.uri }} style={styles.photoPreview} />}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <TouchableOpacity style={[styles.button, styles.buttonFlex]} onPress={handleCreateBill} disabled={creating || customers.length === 0}>
                    {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Create</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.buttonSecondary, styles.buttonFlex]} onPress={() => setShowNewBill(false)}>
                    <Text style={styles.buttonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {activeScreen === "customers" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Customers</Text>
            {customersLoading ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : customers.length === 0 ? (
              <Text style={styles.emptyText}>No customers yet.</Text>
            ) : (
              customers.map((c) => (
                <View key={c.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{c.name}</Text>
                  {c.email ? <Text style={styles.listMeta}>{c.email}</Text> : null}
                </View>
              ))
            )}
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>Add customer</Text>
            <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#94a3b8" value={newCustomerName} onChangeText={setNewCustomerName} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94a3b8" keyboardType="email-address" value={newCustomerEmail} onChangeText={setNewCustomerEmail} />
            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#94a3b8" keyboardType="phone-pad" value={newCustomerPhone} onChangeText={setNewCustomerPhone} />
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput style={styles.input} placeholder="Street" placeholderTextColor="#94a3b8" value={newCustomerAddress1} onChangeText={setNewCustomerAddress1} />
            <TextInput style={styles.input} placeholder="Apt, suite (optional)" placeholderTextColor="#94a3b8" value={newCustomerAddress2} onChangeText={setNewCustomerAddress2} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="City" placeholderTextColor="#94a3b8" value={newCustomerCity} onChangeText={setNewCustomerCity} />
              <TextInput style={[styles.input, { width: 70 }]} placeholder="State" placeholderTextColor="#94a3b8" value={newCustomerState} onChangeText={setNewCustomerState} />
              <TextInput style={[styles.input, { width: 90 }]} placeholder="ZIP" placeholderTextColor="#94a3b8" keyboardType="number-pad" value={newCustomerPostal} onChangeText={setNewCustomerPostal} />
            </View>
            <TouchableOpacity onPress={() => setNewCustomerSmsConsent((v) => !v)} style={{ flexDirection: "row", alignItems: "center", marginVertical: 8 }}>
              <View style={[styles.checkbox, newCustomerSmsConsent && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>SMS consent for reminders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, creatingCustomer && styles.buttonDisabled]} onPress={handleCreateCustomer} disabled={creatingCustomer}>
              {creatingCustomer ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Save customer</Text>}
            </TouchableOpacity>
          </View>
        )}

        {activeScreen === "templates" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Templates</Text>
            {templatesLoading ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : templates.length === 0 ? (
              <Text style={styles.emptyText}>No templates. Create them on the web.</Text>
            ) : (
              templates.map((t) => (
                <View key={t.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{t.name}</Text>
                  <Text style={styles.listMeta}>{formatMoney(t.amount_cents)} · {t.description || "—"}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeScreen === "sent-bills" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sent bills</Text>
            {invoicesLoading ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : invoices.length === 0 ? (
              <Text style={styles.emptyText}>No sent bills yet.</Text>
            ) : (
              invoices.map((inv) => (
                <View key={inv.id} style={styles.listRow}>
                  <Text style={styles.listTitle}>{inv.invoice_number} · {inv.customers?.name ?? "—"}</Text>
                  <Text style={styles.listMeta}>{formatMoney(inv.total_cents)} · {inv.status}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeScreen === "reports" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Reports</Text>
            <TouchableOpacity style={styles.linkRow} onPress={() => downloadReport("bills")}>
              <Text style={styles.linkText}>Bills CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={() => downloadReport("send-history")}>
              <Text style={styles.linkText}>Send history CSV</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeScreen === "settings" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Settings</Text>
            {businessLoading ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : business ? (
              <>
                <Text style={styles.listTitle}>{business.name ?? "—"}</Text>
                <Text style={styles.helperText}>Edit logo, invoice footer, and more on the web.</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>Could not load business info.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 56, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 16 },
  loginBox: { flex: 1, justifyContent: "center", maxWidth: 320, width: "100%", alignSelf: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 16, color: "#64748b", marginTop: 4, marginBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  menuBtn: { padding: 8, marginLeft: -8 },
  hamburger: { width: 24, height: 18, justifyContent: "space-between" },
  hamburgerLine: { height: 2, backgroundColor: "#0f172a", borderRadius: 1 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "600", color: "#0f172a", textAlign: "center" },
  signOut: { color: "#64748b", fontSize: 15 },
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", flexDirection: "row" },
  menuPanel: { width: 260, backgroundColor: "#fff", paddingTop: 56, paddingHorizontal: 16, paddingBottom: 24 },
  menuTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 16 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  menuItemActive: { backgroundColor: "#d1fae5" },
  menuItemText: { fontSize: 16, color: "#334155" },
  menuItemTextActive: { color: "#059669", fontWeight: "600" },
  scrollContent: { paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  cardLabel: { fontSize: 14, color: "#64748b", marginBottom: 12 },
  fieldLabel: { marginTop: 12, marginBottom: 4, fontSize: 13, fontWeight: "500", color: "#0f172a" },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 14, fontSize: 16, backgroundColor: "#fff", marginBottom: 12, color: "#0f172a" },
  select: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "#fff", marginBottom: 12 },
  selectText: { fontSize: 15, color: "#0f172a" },
  button: { backgroundColor: "#059669", borderRadius: 8, padding: 16, alignItems: "center" },
  buttonSecondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 16, alignItems: "center" },
  buttonFlex: { flex: 1 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonSecondaryText: { color: "#475569", fontSize: 16, fontWeight: "500" },
  buttonDisabled: { opacity: 0.7 },
  photoButton: { borderRadius: 8, padding: 14, backgroundColor: "#0f172a", alignItems: "center", marginBottom: 8 },
  photoButtonText: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
  photoPreview: { width: 120, height: 120, borderRadius: 8, marginBottom: 12 },
  emptyText: { color: "#94a3b8", fontSize: 14 },
  listRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  listTitle: { fontSize: 15, fontWeight: "500", color: "#0f172a" },
  listMeta: { fontSize: 13, color: "#64748b", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: "#cbd5e1", marginRight: 10 },
  checkboxChecked: { backgroundColor: "#059669", borderColor: "#059669" },
  checkboxLabel: { fontSize: 13, color: "#475569" },
  linkRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  linkText: { fontSize: 15, color: "#059669", fontWeight: "500" },
  helperText: { fontSize: 12, color: "#94a3b8", marginTop: 8 },
});
