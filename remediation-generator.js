// remediation-generator.js
// Automated RLS Policy Generator with Intelligent Pattern Detection

/**
 * Detect table pattern based on column names
 * @param {Array} columns - Array of column objects with name and type
 * @returns {Object} Pattern detection result
 */
function detectTablePattern(columns) {
    const columnNames = columns.map(c => c.name.toLowerCase());
    
    // Check for user isolation pattern
    const userIdColumn = columns.find(c => 
        /^(user_id|owner_id|created_by|author_id|uid)$/i.test(c.name)
    );
    
    // Check for multi-tenant pattern
    const tenantColumn = columns.find(c => 
        /^(org_id|organization_id|tenant_id|company_id|workspace_id)$/i.test(c.name)
    );
    
    // Check for public data pattern
    const hasPublicFlag = columns.find(c => 
        /^(is_public|public|published)$/i.test(c.name)
    );
    
    return {
        pattern: userIdColumn ? 'user-isolated' : 
                 tenantColumn ? 'multi-tenant' : 
                 hasPublicFlag ? 'public-optional' : 'generic',
        userIdColumn: userIdColumn?.name,
        tenantColumn: tenantColumn?.name,
        publicColumn: hasPublicFlag?.name
    };
}

/**
 * Quote SQL identifier to prevent injection
 * @param {string} name - Identifier to quote
 * @returns {string} Safely quoted identifier
 */
function quoteSQLIdentifier(name) {
    return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Generate comprehensive RLS policies for a table
 * @param {Object} table - Table object with metadata
 * @returns {Object} Generated SQL and metadata
 */
function generateRLSPolicies(table) {
    const tableName = table.tableName;
    const columns = table.exposedColumns || [];
    const pattern = detectTablePattern(columns);
    
    // SQL identifier quoting for safety
    const qt = quoteSQLIdentifier;
    
    let sql = `-- ============================================
-- RLS Policies for: ${tableName}
-- Pattern: ${pattern.pattern}
-- Generated: ${new Date().toISOString()}
-- ============================================

-- Step 1: Enable Row Level Security
ALTER TABLE ${qt(tableName)} ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (clean slate)
DROP POLICY IF EXISTS "select_policy" ON ${qt(tableName)};
DROP POLICY IF EXISTS "insert_policy" ON ${qt(tableName)};
DROP POLICY IF EXISTS "update_policy" ON ${qt(tableName)};
DROP POLICY IF EXISTS "delete_policy" ON ${qt(tableName)};

`;

    if (pattern.pattern === 'user-isolated') {
        sql += `-- Step 3: User-Isolated Policies
-- Users can only access their own data

CREATE POLICY "select_policy"
ON ${qt(tableName)}
FOR SELECT
TO authenticated
USING (${qt(pattern.userIdColumn)} = auth.uid());

CREATE POLICY "insert_policy"
ON ${qt(tableName)}
FOR INSERT
TO authenticated
WITH CHECK (${qt(pattern.userIdColumn)} = auth.uid());

CREATE POLICY "update_policy"
ON ${qt(tableName)}
FOR UPDATE
TO authenticated
USING (${qt(pattern.userIdColumn)} = auth.uid())
WITH CHECK (${qt(pattern.userIdColumn)} = auth.uid());

CREATE POLICY "delete_policy"
ON ${qt(tableName)}
FOR DELETE
TO authenticated
USING (${qt(pattern.userIdColumn)} = auth.uid());
`;
    } else if (pattern.pattern === 'multi-tenant') {
        sql += `-- Step 3: Multi-Tenant Policies
-- Users can access data from their organization

CREATE POLICY "select_policy"
ON ${qt(tableName)}
FOR SELECT
TO authenticated
USING (
    ${qt(pattern.tenantColumn)} IN (
        SELECT org_id FROM user_organizations 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "insert_policy"
ON ${qt(tableName)}
FOR INSERT
TO authenticated
WITH CHECK (
    ${qt(pattern.tenantColumn)} IN (
        SELECT org_id FROM user_organizations 
        WHERE user_id = auth.uid()
    )
);

-- Note: Adjust user_organizations table name to match your schema
`;
    } else if (pattern.pattern === 'public-optional') {
        sql += `-- Step 3: Public-Optional Policies
-- Public data is readable by all, private data only by owner

CREATE POLICY "select_policy"
ON ${qt(tableName)}
FOR SELECT
TO authenticated
USING (
    ${qt(pattern.publicColumn)} = true
    OR ${qt(pattern.userIdColumn || 'user_id')} = auth.uid()
);

CREATE POLICY "insert_policy"
ON ${qt(tableName)}
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
`;
    } else {
        sql += `-- Step 3: Generic Authenticated-Only Policies
-- Restrict to authenticated users only

CREATE POLICY "select_policy"
ON ${qt(tableName)}
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "insert_policy"
ON ${qt(tableName)}
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ⚠️ WARNING: These policies allow all authenticated users to access all data.
-- Review and customize based on your requirements.
`;
    }

    sql += `
-- Step 4: (Optional) Admin Override
-- Uncomment if you have an admin role system
/*
CREATE POLICY "admin_all_policy"
ON ${qt(tableName)}
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
*/

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ${qt(tableName)} TO authenticated;
GRANT SELECT ON ${qt(tableName)} TO anon;  -- Remove if table should not be publicly readable
`;

    return {
        sql,
        pattern: pattern.pattern,
        recommendation: getPatternRecommendation(pattern)
    };
}

/**
 * Get recommendation text for detected pattern
 * @param {Object} pattern - Pattern detection result
 * @returns {string} Recommendation text
 */
function getPatternRecommendation(pattern) {
    const recommendations = {
        'user-isolated': '✅ User isolation detected. Policies ensure users can only access their own data.',
        'multi-tenant': '✅ Multi-tenant pattern detected. Policies enforce organization-level isolation.',
        'public-optional': '⚠️ Public/private data detected. Review the public flag logic carefully.',
        'generic': '⚠️ Generic policies applied. CUSTOMIZE these based on your access requirements!'
    };
    return recommendations[pattern.pattern] || '';
}

/**
 * Generate bulk migration for all vulnerable tables
 * @param {Array} tables - Array of table objects
 * @returns {string} Complete migration SQL
 */
function generateBulkMigration(tables) {
    const vulnerableTables = tables.filter(t =>
        !t.blocked &&
        t.vulnerabilityLevel !== 'safe' &&
        t.vulnerabilityLevel !== 'protected'
    );

    if (vulnerableTables.length === 0) {
        return '-- No vulnerable tables found. All tables are protected!';
    }

    let migration = `-- ============================================
-- SUPABASE RLS MIGRATION
-- Generated: ${new Date().toISOString()}
-- Vulnerable Tables: ${vulnerableTables.length}
-- ============================================
--
-- INSTRUCTIONS:
-- 1. Review each policy carefully
-- 2. Customize based on your access requirements
-- 3. Test in development environment first
-- 4. Run this migration in Supabase SQL Editor
--
-- ============================================

BEGIN;

`;

    vulnerableTables.forEach((table, index) => {
        const policies = generateRLSPolicies(table);
        migration += `\n${policies.sql}\n`;

        if (index < vulnerableTables.length - 1) {
            migration += `\n-- ============================================\n\n`;
        }
    });

    migration += `\nCOMMIT;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Verify policies are active: SELECT * FROM pg_policies;
-- 2. Test access with different user roles
-- 3. Monitor for access denied errors
-- 4. Adjust policies as needed
`;

    return migration;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateRLSPolicies,
        generateBulkMigration,
        detectTablePattern,
        quoteSQLIdentifier
    };
}

