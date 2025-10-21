# create-investor.example.json

Example template for creating investor configuration files. Copy and modify for your testing needs.

## Structure
Same as `create-investor.json` but with sample data showing different investor types and attribute combinations.

## Usage
```bash
# Copy example file
cp qa/tasks/config/create-investor.example.json qa/tasks/config/my-investors.json

# Edit my-investors.json with your test data
# Then run:
npx hardhat create-investor qa/tasks/config/my-investors.json --generatewallets --generateuniqueids --network sepolia
```

## Example Shows
- Different country configurations (US, EU)
- Various attribute combinations for compliance testing
- Empty wallet arrays (populated with `--generatewallets`)
- Collision hash patterns for unique ID generation

## Notes
- Template only - modify before use
- Shows common attribute patterns for different investor types
- Use as starting point for custom test scenarios

