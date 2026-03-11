import "react-native-url-polyfill/auto";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from "./src/lib/supabase";
import { apiFetch } from "./src/lib/api";

type DashboardStats = {
  totalOutstanding?: number;
  billedInPeriod?: number;
  paymentsInPeriod?: number;
};

type Tab = "bill" | "customers";

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type PhotoAsset = {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("bill");
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
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

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s as { access_token: string } | null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s as { access_token: string } | null);
      if (!s) {
        setDashboard(null);
        setCustomers([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    setDashboardLoading(true);
    apiFetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setDashboard(d);
      })
      .catch(() => {})
      .finally(() => setDashboardLoading(false));

    loadCustomers();
  }, [session]);

  const loadCustomers = () => {
    setCustomersLoading(true);
    apiFetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        const list: Customer[] = d.customers || [];
        setCustomers(list);
        if (list.length === 1 && !selectedCustomerId) {
          setSelectedCustomerId(list[0].id);
        }
      })
      .catch(() => setCustomers([]))
      .finally(() => setCustomersLoading(false));
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
    setDashboard(null);
    setCustomers([]);
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setNewCustomerAddress1("");
    setNewCustomerAddress2("");
    setNewCustomerCity("");
    setNewCustomerState("");
    setNewCustomerPostal("");
    setNewCustomerSmsConsent(false);
    setSelectedCustomerId("");
    setAmount("");
    setDescription("");
    setPhoto(null);
  };

  const formatMoney = (cents: number) =>
    "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera permission",
        "Camera access is required to take a photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  };

  const handleCreateBill = async () => {
    if (!selectedCustomerId) {
      Alert.alert("Missing info", "Select a customer.");
      return;
    }
    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (!amountCents || amountCents <= 0) {
      Alert.alert("Missing info", "Enter an amount greater than 0.");
      return;
    }
    if (!dueDate) {
      Alert.alert("Missing info", "Select a due date.");
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
      if (!billRes.ok) {
        throw new Error(billData.error || "Failed to create bill");
      }
      const billId = billData.bill?.id as string | undefined;

      if (billId && photo) {
        const formData = new FormData();
        formData.append("file", {
          uri: photo.uri,
          name: "photo.jpg",
          type: photo.mimeType || "image/jpeg",
        } as any);

        const uploadRes = await apiFetch(`/api/bills/${billId}/attachment`, {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(
            uploadData.error || "Bill created but photo upload failed",
          );
        }
      }

      Alert.alert("Saved", "Bill created.");
      setAmount("");
      setDescription("");
      setPhoto(null);
      setDueDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create bill",
      );
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to create customer");
      }
      const created: Customer | undefined = data.customer;
      await loadCustomers();
      if (created?.id) {
        setSelectedCustomerId(created.id);
      }
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
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create customer",
      );
    } finally {
      setCreatingCustomer(false);
    }
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
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, signingIn && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={signingIn}
          >
            {signingIn ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const outstanding = dashboard?.totalOutstanding ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>BillPay Secure</Text>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "bill" && styles.tabActive,
              ]}
              onPress={() => setActiveTab("bill")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "bill" && styles.tabTextActive,
                ]}
              >
                New bill
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "customers" && styles.tabActive,
              ]}
              onPress={() => setActiveTab("customers")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "customers" && styles.tabTextActive,
                ]}
              >
                Customers
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Outstanding</Text>
          {dashboardLoading ? (
            <ActivityIndicator
              size="small"
              color="#059669"
              style={styles.dashLoader}
            />
          ) : (
            <Text style={styles.cardValue}>{formatMoney(outstanding)}</Text>
          )}
        </View>

        {activeTab === "bill" ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>New bill</Text>

            <Text style={styles.fieldLabel}>Customer</Text>
            {customersLoading ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : customers.length === 0 ? (
              <Text style={styles.emptyText}>
                Add a customer first (see Customers tab).
              </Text>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => {
                    if (!selectedCustomerId && customers[0]) {
                      setSelectedCustomerId(customers[0].id);
                    } else {
                      const currentIdx = customers.findIndex(
                        (c) => c.id === selectedCustomerId,
                      );
                      const next =
                        currentIdx >= 0 && currentIdx < customers.length - 1
                          ? customers[currentIdx + 1]
                          : customers[0];
                      setSelectedCustomerId(next.id);
                    }
                  }}
                >
                  <Text style={styles.selectText}>
                    {selectedCustomerId
                      ? customers.find((c) => c.id === selectedCustomerId)
                          ?.name ?? "Select customer"
                      : "Tap to cycle customers"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.fieldLabel}>Amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Invoice"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.fieldLabel}>Due date</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Job photo (optional)</Text>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handlePickPhoto}
            >
              <Text style={styles.photoButtonText}>Add photo from camera</Text>
            </TouchableOpacity>
            {photo && (
              <View style={styles.photoPreviewWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <Text style={styles.helperText}>
                  Attached. Will upload with bill.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                creating && styles.buttonDisabled,
                { marginTop: 16 },
              ]}
              onPress={handleCreateBill}
              disabled={creating || customers.length === 0}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Create bill</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Customers</Text>

            {customersLoading ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : customers.length === 0 ? (
              <Text style={styles.emptyText}>
                No customers yet. Add one below.
              </Text>
            ) : (
              customers.map((c) => (
                <View key={c.id} style={styles.customerRow}>
                  <Text style={styles.customerName}>{c.name}</Text>
                </View>
              ))
            )}

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Add customer</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#94a3b8"
              value={newCustomerName}
              onChangeText={setNewCustomerName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email (optional)"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newCustomerEmail}
              onChangeText={setNewCustomerEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={newCustomerPhone}
              onChangeText={setNewCustomerPhone}
            />
            <Text style={styles.fieldLabel}>Mailing address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street address"
              placeholderTextColor="#94a3b8"
              value={newCustomerAddress1}
              onChangeText={setNewCustomerAddress1}
            />
            <TextInput
              style={styles.input}
              placeholder="Apt, suite, etc. (optional)"
              placeholderTextColor="#94a3b8"
              value={newCustomerAddress2}
              onChangeText={setNewCustomerAddress2}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="City"
                placeholderTextColor="#94a3b8"
                value={newCustomerCity}
                onChangeText={setNewCustomerCity}
              />
              <TextInput
                style={[styles.input, { width: 70 }]}
                placeholder="State"
                placeholderTextColor="#94a3b8"
                value={newCustomerState}
                onChangeText={setNewCustomerState}
              />
              <TextInput
                style={[styles.input, { width: 90 }]}
                placeholder="ZIP"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={newCustomerPostal}
                onChangeText={setNewCustomerPostal}
              />
            </View>
            <TouchableOpacity
              onPress={() => setNewCustomerSmsConsent((v) => !v)}
              style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 8 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: "#cbd5e1",
                  marginRight: 8,
                  backgroundColor: newCustomerSmsConsent ? "#059669" : "#f8fafc",
                }}
              />
              <Text style={{ flex: 1, fontSize: 11, color: "#475569" }}>
                Customer consents to receive payment reminder text messages. Message
                and data rates may apply.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                creatingCustomer && styles.buttonDisabled,
                { marginTop: 8 },
              ]}
              onPress={handleCreateCustomer}
              disabled={creatingCustomer}
            >
              {creatingCustomer ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Save customer</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 16,
  },
  loginBox: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 320,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 12,
    color: "#0f172a",
  },
  button: {
    backgroundColor: "#059669",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  signOut: {
    color: "#64748b",
    fontSize: 15,
  },
  dashboard: {
    flex: 1,
  },
  dashLoader: {
    marginTop: 48,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardInRow: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 4,
  },
  green: {
    color: "#059669",
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 8,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: "500",
    color: "#0f172a",
  },
  select: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  selectText: {
    fontSize: 15,
    color: "#0f172a",
  },
  helperText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  },
  photoButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#0f172a",
    alignItems: "center",
    marginTop: 4,
  },
  photoButtonText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "500",
  },
  photoPreviewWrapper: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  tab: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    marginRight: 6,
    backgroundColor: "#e5e7eb",
  },
  tabActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  tabText: {
    fontSize: 12,
    color: "#0f172a",
  },
  tabTextActive: {
    color: "#f9fafb",
  },
  customerRow: {
    paddingVertical: 6,
  },
  customerName: {
    fontSize: 14,
    color: "#0f172a",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },
});
