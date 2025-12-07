#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║ GlobalMarket Analytics - Master Setup Script                               ║
# ║ MongoDB Setup Script [BETA]                                                ║
# ╚════════════════════════════════════════════════════════════════════════════╝

set -e  # Exit on error

# ═══════════════════════════════════════════════════════════════════════════════
# 🎨 COLORS & FORMATTING
# ═══════════════════════════════════════════════════════════════════════════════
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════════════
# � LOAD ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════════════════
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ -f "$ENV_FILE" ]]; then
    # Load .env file (skip comments and empty lines)
    set -a
    source <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed 's/\r$//')
    set +a
fi

# ═══════════════════════════════════════════════════════════════════════════════
# �📋 CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
DB_NAME="globalmarket"
DATA_DIR="data/processed"
SCRIPTS_DIR="scripts"

# Collections to import
declare -a COLLECTIONS=("products" "users" "sales" "reviews")

# ═══════════════════════════════════════════════════════════════════════════════
# 🔧 UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${GREEN}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 🔍 PREREQUISITES CHECK
# ═══════════════════════════════════════════════════════════════════════════════

check_prerequisites() {
    print_header "🔍 Checking Prerequisites"
    
    local missing_deps=0
    
    # Check mongoimport
    if command -v mongoimport &> /dev/null; then
        print_success "mongoimport found: $(mongoimport --version 2>&1 | head -n1)"
    else
        print_error "mongoimport not found. Please install MongoDB Database Tools."
        missing_deps=1
    fi
    
    # Check mongosh
    if command -v mongosh &> /dev/null; then
        print_success "mongosh found: $(mongosh --version 2>&1 | head -n1)"
    else
        print_warning "mongosh not found. Schema validation and indexing will be skipped."
    fi
    
    # Check Python (optional)
    if command -v python &> /dev/null || command -v python3 &> /dev/null; then
        local python_cmd=$(command -v python3 || command -v python)
        print_success "Python found: $($python_cmd --version)"
    else
        print_warning "Python not found. ETL scripts will be skipped."
    fi
    
    # Check data files exist
    print_step "Checking data files..."
    for collection in "${COLLECTIONS[@]}"; do
        if [[ -f "${DATA_DIR}/${collection}.json" ]]; then
            local size=$(du -h "${DATA_DIR}/${collection}.json" | cut -f1)
            print_success "${collection}.json exists (${size})"
        else
            print_error "${collection}.json not found in ${DATA_DIR}/"
            missing_deps=1
        fi
    done
    
    if [[ $missing_deps -eq 1 ]]; then
        print_error "Missing dependencies. Please install required tools."
        exit 1
    fi
    
    echo ""
    print_success "All prerequisites satisfied!"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 🔑 CONNECTION STRING
# ═══════════════════════════════════════════════════════════════════════════════

get_connection_string() {
    print_header "🔑 MongoDB Atlas Connection"
    
    # Priority 1: Full URI from environment
    if [[ -n "$MONGODB_URI" ]]; then
        print_info "Using MONGODB_URI from environment variable"
        CONNECTION_STRING="$MONGODB_URI"
    # Priority 2: Build URI from individual variables (from .env)
    elif [[ -n "$MONGO_USER" && -n "$MONGO_PASSWORD" && -n "$MONGO_CLUSTER" ]]; then
        print_info "Building connection string from .env credentials"
        CONNECTION_STRING="mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_CLUSTER}"
        print_success "Connection string built successfully!"
    # Priority 3: Ask user for input
    else
        echo -e "${YELLOW}Enter your MongoDB Atlas connection string:${NC}"
        echo -e "${CYAN}Format: mongodb+srv://username:password@cluster.mongodb.net${NC}"
        echo ""
        echo -e "${CYAN}Or configure your .env file with:${NC}"
        echo -e "  MONGO_USER=\"your_username\""
        echo -e "  MONGO_PASSWORD=\"your_password\""
        echo -e "  MONGO_CLUSTER=\"your_cluster.mongodb.net\""
        echo ""
        read -p "Connection String: " CONNECTION_STRING
        
        if [[ -z "$CONNECTION_STRING" ]]; then
            print_error "Connection string cannot be empty!"
            exit 1
        fi
    fi
    
    # Validate connection
    print_step "Testing connection..."
    if mongosh "$CONNECTION_STRING/$DB_NAME" --eval "db.runCommand({ping: 1})" --quiet &> /dev/null; then
        print_success "Connection successful!"
    else
        print_warning "Could not validate connection. Proceeding anyway..."
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 🛡️ SCHEMA VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

apply_validation() {
    print_header "🛡️ Applying Schema Validation"
    
    if [[ ! -f "${SCRIPTS_DIR}/validation.js" ]]; then
        print_warning "validation.js not found. Skipping..."
        return
    fi
    
    if ! command -v mongosh &> /dev/null; then
        print_warning "mongosh not available. Skipping validation..."
        return
    fi
    
    print_step "Creating collections with JSON Schema validation..."
    
    if mongosh "$CONNECTION_STRING/$DB_NAME" --file "${SCRIPTS_DIR}/validation.js" --quiet; then
        print_success "Schema validation applied successfully!"
    else
        print_error "Failed to apply schema validation"
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📥 DATA IMPORT
# ═══════════════════════════════════════════════════════════════════════════════

import_data() {
    print_header "📥 Importing Data to MongoDB Atlas"
    
    for collection in "${COLLECTIONS[@]}"; do
        local file="${DATA_DIR}/${collection}.json"
        
        if [[ ! -f "$file" ]]; then
            print_error "File not found: $file"
            continue
        fi
        
        print_step "Importing ${collection}..."
        
        local start_time=$(date +%s)
        
        if mongoimport \
            --uri "$CONNECTION_STRING" \
            --db "$DB_NAME" \
            --collection "$collection" \
            --file "$file" \
            --jsonArray \
            --drop; then
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            print_success "${collection} imported successfully! (${duration}s)"
        else
            print_error "Failed to import ${collection}"
            exit 1
        fi
    done
    
    echo ""
    print_success "All collections imported successfully!"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ⚡ INDEXING
# ═══════════════════════════════════════════════════════════════════════════════

create_indexes() {
    print_header "⚡ Creating Indexes"
    
    if [[ ! -f "${SCRIPTS_DIR}/index.js" ]]; then
        print_warning "index.js not found. Skipping..."
        return
    fi
    
    if ! command -v mongosh &> /dev/null; then
        print_warning "mongosh not available. Skipping indexing..."
        return
    fi
    
    print_step "Creating compound indexes and Atlas Search configuration..."
    
    if mongosh "$CONNECTION_STRING/$DB_NAME" --file "${SCRIPTS_DIR}/index.js" --quiet; then
        print_success "Indexes created successfully!"
    else
        print_error "Failed to create indexes"
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# 📊 VERIFY IMPORT
# ═══════════════════════════════════════════════════════════════════════════════

verify_import() {
    print_header "📊 Verifying Import"
    
    if ! command -v mongosh &> /dev/null; then
        print_warning "mongosh not available. Skipping verification..."
        return
    fi
    
    print_step "Counting documents in each collection..."
    echo ""
    
    mongosh "$CONNECTION_STRING/$DB_NAME" --quiet --eval "
        const collections = ['products', 'users', 'sales', 'reviews'];
        console.log('┌────────────────┬──────────────┐');
        console.log('│   Collection   │   Documents  │');
        console.log('├────────────────┼──────────────┤');
        collections.forEach(col => {
            const count = db.getCollection(col).countDocuments();
            const padCol = col.padEnd(14);
            const padCount = count.toString().padStart(12);
            console.log('│ ' + padCol + ' │' + padCount + ' │');
        });
        console.log('└────────────────┴──────────────┘');
    "
    
    echo ""
    print_success "Verification complete!"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 🎯 MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    clear
    echo -e "${CYAN}"
    echo "  ╔═══════════════════════════════════════════════════════════════════╗"
    echo "  ║                                                                   ║"
    echo "  ║   🚀 GlobalMarket Analytics - MongoDB Atlas Setup                 ║"
    echo "  ║                                                                   ║"
    echo "  ║   Universidad Nacional Experimental de Guayana (UNEG)            ║"
    echo "  ║   Sistemas de Bases de Datos II • 2025-II                        ║"
    echo "  ║                                                                   ║"
    echo "  ╚═══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Parse arguments
    SKIP_VALIDATION=false
    SKIP_INDEXES=false
    SKIP_VERIFY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --skip-indexes)
                SKIP_INDEXES=true
                shift
                ;;
            --skip-verify)
                SKIP_VERIFY=true
                shift
                ;;
            --uri)
                CONNECTION_STRING="$2"
                shift 2
                ;;
            --help|-h)
                echo "Usage: ./master_setup.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --uri <string>      MongoDB connection string"
                echo "  --skip-validation   Skip schema validation step"
                echo "  --skip-indexes      Skip index creation step"
                echo "  --skip-verify       Skip verification step"
                echo "  --help, -h          Show this help message"
                echo ""
                echo "Environment Variables:"
                echo "  MONGODB_URI         MongoDB connection string (alternative to --uri)"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute pipeline
    local start_time=$(date +%s)
    
    check_prerequisites
    
    if [[ -z "$CONNECTION_STRING" ]]; then
        get_connection_string
    fi
    
    if [[ "$SKIP_VALIDATION" != true ]]; then
        apply_validation
    else
        print_info "Skipping validation (--skip-validation)"
    fi
    
    import_data
    
    if [[ "$SKIP_INDEXES" != true ]]; then
        create_indexes
    else
        print_info "Skipping indexes (--skip-indexes)"
    fi
    
    if [[ "$SKIP_VERIFY" != true ]]; then
        verify_import
    else
        print_info "Skipping verification (--skip-verify)"
    fi
    
    # Summary
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    print_header "🎉 Setup Complete!"
    
    echo -e "${GREEN}  ┌─────────────────────────────────────────────────────────┐${NC}"
    echo -e "${GREEN}  │                   📊 Summary                            │${NC}"
    echo -e "${GREEN}  ├─────────────────────────────────────────────────────────┤${NC}"
    echo -e "${GREEN}  │  ✅ Database:     ${DB_NAME}                           │${NC}"
    echo -e "${GREEN}  │  ✅ Collections:  ${#COLLECTIONS[@]} imported                          │${NC}"
    echo -e "${GREEN}  │  ⏱️  Duration:     ${total_duration} seconds                           │${NC}"
    echo -e "${GREEN}  └─────────────────────────────────────────────────────────┘${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "  1. Open MongoDB Atlas and verify the data"
    echo -e "  2. Configure Atlas Search indexes (if needed)"
    echo -e "  3. Run queries: ${BOLD}mongosh \$MONGODB_URI --file scripts/queries.js${NC}"
    echo ""
    echo -e "${BOLD}Happy querying! 🚀${NC}"
}

# Run main function with all arguments
main "$@"