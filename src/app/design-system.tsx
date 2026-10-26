import {
  ArrowRight,
  ChevronLeft,
  Mail,
  Bookmark,
  Building2,
  Calendar,
  Check,
  CreditCard,
  Heart,
  Home,
  List,
  Lock,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  PawPrint,
  Search,
  Settings,
  Share,
  SlidersHorizontal,
  Star,
  Tent,
  TriangleAlert,
  TreePalm,
  User,
  Briefcase,
  Waves,
  X,
  FileText,
} from "lucide-react-native";
import { useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import {
  Alert,
  Badge,
  Button,
  Chip,
  CodeInput,
  Divider,
  Icon,
  IconButton,
  ListingCard,
  PolicyCard,
  ProfileList,
  ProfileRow,
  SegmentedControl,
  Section,
  SocialButtons,
  Stepper,
  TabBar,
  Text,
  TextField,
  Toggle,
  Wordmark,
} from "@/components";

// Documentation only: the live colors come from the tokens in src/global.css.
const palette = [
  { name: "Primary Yellow", hex: "#FFC629", role: "Primary actions, active states", cls: "bg-primary" },
  { name: "Lavender", hex: "#C9B4FF", role: "Secondary actions, highlights", cls: "bg-secondary" },
  { name: "Text Primary", hex: "#0B0B1A", role: "Headings, primary text", cls: "bg-ink" },
  { name: "Text Secondary", hex: "#6B7280", role: "Body text, secondary text", cls: "bg-muted" },
  { name: "Surface White", hex: "#FFFFFF", role: "Cards, sheets, modals", cls: "bg-surface" },
  { name: "Surface Gray", hex: "#F4F5F7", role: "App background, input fields", cls: "bg-surface-alt" },
  { name: "Border Gray", hex: "#E5E7EB", role: "Dividers, borders", cls: "bg-border" },
  { name: "Glass Blur", hex: "rgba(255,255,255,0.7)", role: "Tab bar, glass surfaces", cls: "bg-glass" },
];

const icons = [Home, Search, Heart, Calendar, User, Settings, MapPin, SlidersHorizontal];

const typeRamp = [
  { variant: "display", name: "Display", spec: "Bold · 56 / 56", sample: "Find your next stay" },
  { variant: "heading", name: "Heading", spec: "Bold · 28 / 34", sample: "Modern Cabin with Hot Tub" },
  { variant: "title", name: "Title", spec: "SemiBold · 20 / 26", sample: "Lake Arrowhead, CA" },
  {
    variant: "body",
    name: "Body",
    spec: "Regular · 16 / 24",
    sample: "From mountain cabins to oceanfront villas, roam helps you find unforgettable stays.",
  },
  { variant: "caption", name: "Caption", spec: "Medium · 14 / 20", sample: "Lake Arrowhead, CA" },
  { variant: "button", name: "Button", spec: "Medium · 17 / 22", sample: "Book this stay" },
] as const;

export default function DesignSystem() {
  const [category, setCategory] = useState("All Stays");
  const [filter, setFilter] = useState("Cabins");
  const [view, setView] = useState<"list" | "map">("list");
  const [on, setOn] = useState(true);
  const [guests, setGuests] = useState(1);
  const [tab, setTab] = useState("home");
  const [favorite, setFavorite] = useState(false);
  const [code, setCode] = useState("12");
  // ?only=04,07 renders just those sections (handy for screenshots).
  const { only } = useLocalSearchParams<{ only?: string }>();
  const shown = only?.split(",");
  const show = (n: string) => !shown || shown.includes(n);

  return (
    <ScrollView className="flex-1 bg-surface-alt" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 px-5 py-4">
      <Stack.Screen options={{ title: "Design system" }} />
      {show("01") && (
      <Section number="01" title="Brand">
        <Wordmark />
        <Wordmark size="sm" tagline={false} />
        <Wordmark size="xs" tagline={false} />
      </Section>
      )}

      {show("02") && (
      <Section number="02" title="Color palette">
        <View className="gap-3">
          {palette.map((c) => (
            <View key={c.name} className="flex-row items-center gap-3">
              <View className={`size-14 rounded-sm border border-border ${c.cls}`} />
              <View className="flex-1">
                <Text variant="caption">{c.name}</Text>
                <Text variant="small">
                  {c.hex} · {c.role}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Section>
      )}

      {show("03") && (
      <Section number="03" title="Typography">
        <View className="gap-4">
          {typeRamp.map((t) => (
            <View key={t.name} className="gap-1">
              <Text variant="caption" className="text-muted">
                {t.name} · {t.spec}
              </Text>
              <Text variant={t.variant}>{t.sample}</Text>
            </View>
          ))}
        </View>
      </Section>
      )}

      {show("04") && (
      <Section number="04" title="Buttons">
        <Button title="Book this stay" trailing={<Icon icon={ArrowRight} />} />
        <Button title="Continue with Google" variant="secondary" />
        <SocialButtons onPress={() => {}} />
        <Button title="Loading" loading />
        <Button title="Disabled" disabled />
        <View className="flex-row gap-3">
          {(
            [
              ["Favorite", Heart],
              ["Share", Share],
              ["Search", Search],
              ["Save", Bookmark],
            ] as const
          ).map(([label, icon]) => (
            <IconButton key={label} label={label}>
              <Icon icon={icon} size="lg" />
            </IconButton>
          ))}
          <IconButton label="Back" variant="outline">
            <Icon icon={ChevronLeft} size="lg" />
          </IconButton>
        </View>
      </Section>
      )}

      {show("05") && (
      <Section number="05" title="Input fields">
        <TextField
          label="Search"
          defaultValue="Cabins in California"
          leading={<Icon icon={Search} />}
          trailing={<Icon icon={SlidersHorizontal} />}
        />
        <TextField label="Name" placeholder="Enter your name" leading={<Icon icon={User} />} />
        <TextField label="Name, focused" defaultValue="Joanna Smith" forceFocus leading={<Icon icon={User} />} />
        <TextField
          label="Password"
          secureTextEntry
          defaultValue="password"
          leading={<Icon icon={Lock} />}
        />
        <TextField label="Email" placeholder="Email" error="Enter a valid email" />
        <TextField
          label="Email address"
          title="Email address"
          placeholder="you@example.com"
          leading={<Icon icon={Mail} size="lg" />}
        />
        <TextField
          label="Password"
          title="Password"
          placeholder="At least 8 characters"
          secureTextEntry
          leading={<Icon icon={Lock} size="lg" />}
        />
        <CodeInput value={code} onChange={setCode} />
        <Divider label="or" />
      </Section>
      )}

      {show("06") && (
      <Section number="06" title="Filter chips">
        <View className="flex-row flex-wrap gap-3">
          {["Cabins", "Under $300", "Pet Friendly", "Quiet"].map((l) => (
            <Chip key={l} label={l} selected={filter === l} onPress={() => setFilter(l)} />
          ))}
        </View>
        <View className="flex-row flex-wrap gap-3">
          {(
            [
              ["All Stays", Home],
              ["Cabins", Tent],
              ["Beach", Waves],
              ["City", Building2],
              ["Villas", TreePalm],
            ] as const
          ).map(([l, icon]) => (
            <Chip
              key={l}
              variant="accent"
              label={l}
              icon={<Icon icon={icon} size="sm" />}
              selected={category === l}
              onPress={() => setCategory(l)}
            />
          ))}
        </View>
      </Section>
      )}

      {show("07") && (
      <Section number="07" title="Listing card">
        {/* Placeholder photo: real images come from Sanity. */}
        <ListingCard
          title="Modern Cabin with Hot Tub"
          location="Lake Arrowhead, CA"
          rating={4.9}
          reviews={342}
          price={280}
          imageUrl="https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600"
          amenities={[
            { label: "Hot Tub", icon: <Icon icon={Waves} size="sm" /> },
            { label: "Pet Friendly", icon: <Icon icon={PawPrint} size="sm" /> },
          ]}
          favorite={favorite}
          onToggleFavorite={() => setFavorite((f) => !f)}
        />
      </Section>
      )}

      {show("08") && (
      <Section number="08" title="Policy card">
        <PolicyCard
          icon={<Icon icon={MessageCircle} size="lg" className="text-secondary-strong" />}
          title="Ask about policies"
          description="Cancellation, house rules, pets, check-in and more."
        />
        <PolicyCard
          icon={<Icon icon={FileText} size="lg" className="text-secondary-strong" />}
          title="Free cancellation"
          description="Full refund up to 7 days before check-in."
        />
      </Section>
      )}

      {show("09") && (
      <Section number="09" title="Profile row">
        <ProfileList>
          <ProfileRow icon={<Icon icon={User} size="lg" />} label="Personal info" />
          <ProfileRow icon={<Icon icon={CreditCard} size="lg" />} label="Payment methods" />
          <ProfileRow icon={<Icon icon={Briefcase} size="lg" />} label="Trips" />
        </ProfileList>
      </Section>
      )}

      {show("10") && (
      <Section number="10" title="Bottom navigation (Liquid glass tab bar)">
        <View className="gap-3 rounded-lg bg-secondary/30 p-3">
          <TabBar
            activeKey={tab}
            onChange={setTab}
            items={[
              { key: "home", label: "Home", icon: Home },
              { key: "search", label: "Search", icon: Search },
              { key: "trips", label: "Trips", icon: Calendar },
              { key: "profile", label: "Profile", icon: User },
            ]}
          />
        </View>
      </Section>
      )}

      {show("11") && (
      <Section number="11" title="Iconography">
        <View className="flex-row flex-wrap gap-3">
          {icons.map((i, n) => (
            <IconButton key={n} label={`Icon ${n + 1}`} className="bg-surface border border-border">
              <Icon icon={i} size="lg" />
            </IconButton>
          ))}
        </View>
      </Section>
      )}

      {show("12") && (
      <Section number="12" title="Segmented control">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { key: "list", label: "List", icon: (s) => <Icon icon={List} className={s ? "text-surface" : "text-ink"} /> },
            { key: "map", label: "Map", icon: (s) => <Icon icon={MapIcon} className={s ? "text-surface" : "text-ink"} /> },
          ]}
        />
      </Section>
      )}

      {show("13") && (
      <Section number="13" title="Toggles / Steppers">
        <View className="flex-row items-center justify-between">
          <Toggle label="Notifications" value={on} onValueChange={setOn} />
          <Stepper label="Guests" value={guests} onChange={setGuests} min={1} max={10} />
        </View>
      </Section>
      )}

      {show("14") && (
      <Section number="14" title="Status / Alerts">
        <Alert
          message="Account created successfully"
          icon={<Icon icon={Check} className="text-success" />}
          dismissIcon={<Icon icon={X} />}
          onDismiss={() => {}}
        />
        <Alert
          tone="danger"
          message="Something went wrong. Please try again."
          icon={<Icon icon={TriangleAlert} className="text-danger" />}
          dismissIcon={<Icon icon={X} />}
          onDismiss={() => {}}
        />
      </Section>
      )}

      {show("15") && (
      <Section number="15" title="Tags / Badges">
        <View className="flex-row flex-wrap gap-3">
          <Badge label="Guest favorite" icon={<Icon icon={Star} size="sm" className="text-primary" filled />} />
          <Badge tone="success" label="New" />
          <Badge tone="danger" label="20% off" />
          <Badge tone="info" label="Superhost" />
        </View>
      </Section>
      )}
    </ScrollView>
  );
}
