# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [1.3.7] - 2020-11-20
### Fixed
- Fix method `multiInsert` saving multiples rows.
- add github actions

## [1.3.6] - 2019-10-08
### Fixed
- static class helpers are now instanteable to avoid errors when using from multiple origins in the same execution.

## [1.3.5] - 2019-09-11
### Changed
- `_formatFields` method name to `_getFormatFields`

### Fixed
- Non-undefined falsies values can be iserted/saved

## [1.3.4] - 2019-09-06
### Changed
- Dependencies updated

### Fixed
- Conversion of Fields to Camel and Snake cases

## [1.3.3] - 2019-08-28
### Fixed
- `Update` modified `date_modified`

## [1.3.2] - 2019-08-08
## Fixed
- Filters for `flags` takes correct value

## [1.3.1] - 2019-08-06
## Fixed
- Undefined `fields` doesn't break any more

## [1.3.0] - 2019-08-05
## Changed
- `joins` are now added automatically based on fields, filters and other parameters

## [1.2.0] - 2019-07-25
### Changed
-  `addDbName` method form `Model` not need.

## [1.1.0] - 2019-07-17
### Changed
- moved `utils/` to `/lib`
- fixed links in `README.md`

## [1.0.0] - 2019-07-12
### Added
- Project inited
- *Unit Tests* added
- `Utils` lib added
- `Query Builder` added
- `Query Builder` added *Insert*, *Update* and *Remove* functions.
- *"lib/"* folder into package.json files

### Changed
- `Query Builder` select queries with *Get*.
- `Query Builder`constructor only needs Knex and Model.
- Changed modules files folder into *"lib/"*
- `Query Builder Error` have custom code errors.

### Removed
- `Query Builder` *build* and *execute* methods removed.