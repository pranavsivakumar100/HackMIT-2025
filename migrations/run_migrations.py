#!/usr/bin/env python3
"""
Database Migration Runner for HackMIT 2025 AI Agent Platform

This script applies database migrations to the Supabase PostgreSQL database.
It reads migration files from the migrations directory and applies them in order.

Usage:
    python run_migrations.py [--dry-run] [--migration-file <file>]
"""

import os
import sys
import argparse
import asyncio
import asyncpg
from pathlib import Path
from typing import List, Optional
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MigrationRunner:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.migrations_dir = Path(__file__).parent
        
    async def get_applied_migrations(self, conn: asyncpg.Connection) -> List[str]:
        """Get list of already applied migrations from the database."""
        try:
            # Create migrations tracking table if it doesn't exist
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(255) PRIMARY KEY,
                    applied_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            
            # Get applied migrations
            rows = await conn.fetch("SELECT version FROM schema_migrations ORDER BY version")
            return [row['version'] for row in rows]
        except Exception as e:
            logger.warning(f"Could not get applied migrations: {e}")
            return []
    
    async def mark_migration_applied(self, conn: asyncpg.Connection, version: str):
        """Mark a migration as applied in the database."""
        await conn.execute(
            "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING",
            version
        )
    
    def get_migration_files(self) -> List[Path]:
        """Get all migration files in order."""
        migration_files = []
        for file_path in self.migrations_dir.glob("*.sql"):
            if file_path.name.startswith(("001_", "002_", "003_", "004_", "005_")):
                migration_files.append(file_path)
        
        return sorted(migration_files)
    
    async def apply_migration(self, conn: asyncpg.Connection, migration_file: Path, dry_run: bool = False):
        """Apply a single migration file."""
        logger.info(f"{'[DRY RUN] ' if dry_run else ''}Applying migration: {migration_file.name}")
        
        try:
            # Read migration content
            with open(migration_file, 'r', encoding='utf-8') as f:
                migration_sql = f.read()
            
            if dry_run:
                logger.info(f"[DRY RUN] Would execute:\n{migration_sql[:500]}...")
                return True
            
            # Execute migration
            await conn.execute(migration_sql)
            
            # Mark as applied
            version = migration_file.stem
            await self.mark_migration_applied(conn, version)
            
            logger.info(f"✅ Successfully applied migration: {migration_file.name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to apply migration {migration_file.name}: {e}")
            return False
    
    async def run_migrations(self, dry_run: bool = False, specific_file: Optional[str] = None):
        """Run all pending migrations."""
        try:
            # Connect to database
            conn = await asyncpg.connect(self.database_url)
            logger.info("Connected to database")
            
            try:
                # Get applied migrations
                applied_migrations = await self.get_applied_migrations(conn)
                logger.info(f"Applied migrations: {applied_migrations}")
                
                # Get migration files
                migration_files = self.get_migration_files()
                
                if specific_file:
                    # Run specific migration file
                    specific_path = self.migrations_dir / specific_file
                    if not specific_path.exists():
                        logger.error(f"Migration file not found: {specific_file}")
                        return False
                    
                    migration_files = [specific_path]
                
                # Apply pending migrations
                applied_count = 0
                for migration_file in migration_files:
                    version = migration_file.stem
                    
                    if version not in applied_migrations:
                        success = await self.apply_migration(conn, migration_file, dry_run)
                        if success:
                            applied_count += 1
                        else:
                            logger.error(f"Migration failed: {migration_file.name}")
                            return False
                    else:
                        logger.info(f"⏭️  Skipping already applied migration: {migration_file.name}")
                
                if applied_count > 0:
                    logger.info(f"🎉 Successfully applied {applied_count} migration(s)")
                else:
                    logger.info("✨ No new migrations to apply")
                
                return True
                
            finally:
                await conn.close()
                logger.info("Disconnected from database")
                
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description="Run database migrations")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without executing")
    parser.add_argument("--migration-file", help="Run a specific migration file")
    parser.add_argument("--database-url", help="Database URL (overrides SUPABASE_DB_URL env var)")
    
    args = parser.parse_args()
    
    # Get database URL
    database_url = args.database_url or os.getenv("SUPABASE_DB_URL")
    if not database_url:
        logger.error("Database URL not provided. Set SUPABASE_DB_URL environment variable or use --database-url")
        sys.exit(1)
    
    # Run migrations
    runner = MigrationRunner(database_url)
    
    try:
        success = asyncio.run(runner.run_migrations(
            dry_run=args.dry_run,
            specific_file=args.migration_file
        ))
        
        if not success:
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
