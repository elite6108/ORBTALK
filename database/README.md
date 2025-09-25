# Orbit Database Schema

This directory contains the complete database schema for Orbit, a Discord-style MVP with security-first design.

## 📁 Files Overview

- `schema.sql` - Complete database schema with tables, indexes, triggers, and RLS
- `rls-policies.sql` - Detailed Row Level Security policies
- `admin-functions.sql` - Administrative functions for backend management
- `README.md` - This documentation

## 🗄️ Database Architecture

### Core Tables

1. **users** - User profiles extending Supabase auth.users
2. **servers** - Discord-style servers/communities
3. **server_members** - Server membership with roles and permissions
4. **channels** - Text and voice channels within servers
5. **messages** - Chat messages with threading support
6. **message_attachments** - File attachments for messages
7. **voice_sessions** - Active voice channel sessions

### Admin & Moderation Tables

8. **audit_logs** - System audit trail for admin actions
9. **reports** - User reports for moderation
10. **system_settings** - Configurable system settings

## 🔒 Security Features

### Row Level Security (RLS)
- **Complete RLS coverage** on all tables
- **Role-based access control** with granular permissions
- **Server-level permissions** for moderators and admins
- **Channel-level permissions** for private channels
- **Admin-only access** to sensitive tables

### Key Security Principles
- **Principle of least privilege** - Users only see what they need
- **Defense in depth** - Multiple layers of security
- **Audit trail** - All admin actions are logged
- **Rate limiting** - Built-in rate limiting functions
- **Input validation** - Comprehensive constraints and checks

## 🚀 Setup Instructions

### 1. Prerequisites
- Supabase project created
- Database access (via Supabase dashboard or CLI)

### 2. Run Schema Setup
```sql
-- Run in this order:
-- 1. Main schema
\i schema.sql

-- 2. RLS policies
\i rls-policies.sql

-- 3. Admin functions
\i admin-functions.sql
```

### 3. Verify Setup
```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check functions were created
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

## 📊 Key Features

### User Management
- **Profile system** with avatars, status, and bio
- **Role hierarchy** (owner, admin, moderator, member)
- **Ban system** with reasons and audit trail
- **Rate limiting** per user

### Server System
- **Public/private servers** with invite codes
- **Member management** with granular permissions
- **Server verification** and suspension system
- **Member count tracking** with triggers

### Channel System
- **Text and voice channels** with different types
- **Private channels** with custom permissions
- **Channel archiving** and management
- **Position-based ordering**

### Messaging System
- **Real-time messaging** with Supabase Realtime
- **Message threading** and replies
- **File attachments** with size limits
- **Message editing** with time limits
- **Message deletion** with audit trail

### Voice System
- **LiveKit integration** for voice channels
- **Session tracking** for active participants
- **Mute/deafen controls** per user
- **Channel capacity limits**

### Admin Panel
- **User management** (ban, promote, demote)
- **Server management** (suspend, verify)
- **Message moderation** (delete, review reports)
- **System statistics** and analytics
- **Audit logging** for all admin actions
- **System settings** management

## 🔧 Admin Functions

### User Management
- `get_users_admin()` - Paginated user list with filtering
- `ban_user()` - Ban/unban users with reason
- `change_user_role()` - Promote/demote users

### Server Management
- `get_servers_admin()` - Paginated server list with filtering
- `suspend_server()` - Suspend/unsuspend servers
- `verify_server()` - Verify/unverify servers

### Message Moderation
- `get_reported_messages()` - Get reported messages
- `delete_message_admin()` - Delete messages with audit trail

### System Statistics
- `get_system_stats()` - Overall system statistics
- `get_user_activity_stats()` - User activity over time
- `get_audit_logs()` - Audit log with filtering

### System Settings
- `get_system_settings()` - Get all system settings
- `update_system_setting()` - Update system settings

## 🛡️ Security Considerations

### RLS Policies
- **Users** can only see their own data and public profiles
- **Server members** can only see servers they belong to
- **Channel access** is controlled by server membership and channel permissions
- **Messages** are only visible to users with channel access
- **Admin functions** are restricted to admin users only

### Data Protection
- **Soft deletes** for messages and users
- **Audit trails** for all admin actions
- **Rate limiting** to prevent abuse
- **Input validation** with constraints
- **Secure defaults** for all permissions

### Performance
- **Indexes** on all frequently queried columns
- **Triggers** for automatic updates (timestamps, counts)
- **Efficient queries** with proper joins
- **Pagination** for all list functions

## 📈 Scalability Features

### Performance Optimizations
- **Strategic indexes** on foreign keys and search columns
- **Efficient RLS policies** with minimal overhead
- **Pagination support** for all list functions
- **Optimized queries** with proper joins

### Future-Proofing
- **Extensible schema** with JSONB fields for flexibility
- **Modular design** with separate admin functions
- **Comprehensive audit trail** for compliance
- **Flexible permission system** for future features

## 🔍 Monitoring & Maintenance

### Audit Trail
- **All admin actions** are logged with timestamps
- **User actions** are tracked for moderation
- **System changes** are recorded for compliance
- **IP addresses** and user agents are logged

### Maintenance Tasks
- **Regular cleanup** of old audit logs
- **Index maintenance** for performance
- **Statistics updates** for monitoring
- **Backup verification** for data integrity

## 🚨 Important Notes

### Security
- **Never disable RLS** in production
- **Always use admin functions** for administrative tasks
- **Monitor audit logs** regularly
- **Keep permissions minimal** by default

### Performance
- **Monitor query performance** with slow query logs
- **Update statistics** regularly
- **Consider partitioning** for large tables
- **Use connection pooling** for high traffic

### Compliance
- **Data retention policies** should be implemented
- **GDPR compliance** requires data export/deletion functions
- **Audit logs** should be retained per compliance requirements
- **User consent** should be tracked for data processing

## 🔄 Migration Strategy

### Version Control
- **Schema changes** should be versioned
- **Migration scripts** should be tested
- **Rollback plans** should be prepared
- **Data backups** before major changes

### Deployment
- **Staging environment** for testing
- **Gradual rollout** for major changes
- **Monitoring** during deployment
- **Rollback procedures** if issues arise

---

*This schema is designed to be secure, scalable, and maintainable while providing all the features needed for a Discord-style application with comprehensive admin capabilities.*
