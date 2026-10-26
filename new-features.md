### Account

```
Implement the Account screen as shown in attached design using the services and auth architecture already in this project.

Before building, inspect our Clerk setup and research the latest supported APIs for Expo React Native.

Plan how to show and update the user's profile, manage sessions, handle sign out, and safely support account deletion. Reuse our existing auth layer wherever possible.
```

### Saved stays

```
Make Saved stays persistent.

Before building, compare the best options for storing private user-specific saved stay IDs in our current architecture. Explain the tradeoffs and recommend the best approach.

Keep property content in Sanity and private user data outside the public dataset. Wait for my approval before adding any new service.
```

### Booking

```
Plan a production-ready booking flow for Roam.

Guests should choose dates, the server should validate availability and calculate the final price, Stripe should handle payment, and a booking should only be created after confirmed payment.

Research the current Expo and Stripe requirements, explain what private data store we need, and give me the architecture before building anything.
```

### Host side

```
Research how we could add a host version of Roam with multiple users, roles and permissions.

Check the latest Clerk support for Organizations in Expo React Native, explain how a host company, roles and property ownership could work, and call out any limitations before planning the feature.
```

### Production release

```
Review this project for production release.

Check Expo and EAS, API routes, authentication, Sanity, AI services, PostHog, environment variables, secrets, production keys, app store requirements and anything still using development configuration.

Give me a prioritized production checklist first. Don't change anything yet.
```