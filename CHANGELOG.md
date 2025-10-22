# VIPO - Changelog

## [Unreleased] - 2025-03-21

### Fixed
- **CSS Paths**: Standardized all CSS file paths to use consistent kebab-case naming
  - Updated `/assets/css/style-base.css` references in all HTML files
  - Updated `/assets/css/style-shop.css` references in shop pages
  - Updated `/assets/css/style-agent.css` references in agent pages
  - Removed duplicate CSS file references
  - Ensured consistent path formatting (removed trailing slashes)

- **JavaScript Paths**:
  - Fixed case sensitivity in script paths
  - Ensured all script tags have `type="module"` where needed
  - Added missing script references in some pages

- **RTL Support**:
  - Added `dir="rtl"` to all root HTML elements
  - Fixed RTL-specific styling issues in forms and navigation
  - Ensured text alignment is consistent in RTL

- **Mobile Responsiveness**:
  - Fixed horizontal scroll issues at 360px viewport width
  - Improved form field sizing on mobile devices
  - Adjusted padding and margins for better mobile display

- **CSS Optimization**:
  - Removed unused CSS rules
  - Consolidated duplicate style definitions
  - Improved CSS specificity to prevent style overrides

### Changed
- **File Structure**:
  - Organized CSS files into a more modular structure
  - Moved all CSS to `/assets/css/` directory
  - Standardized naming conventions for CSS files

- **Dependencies**:
  - Updated external CDN links to use latest stable versions
  - Added integrity hashes to all external resources

### Added
- **Documentation**:
  - Created this CHANGELOG.md file
  - Added comments in CSS files for better maintainability
  - Documented RTL-specific styles

## [Previous Version] - 2025-03-20
- Initial project setup
- Basic page structure and styling
