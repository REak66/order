const BRANCHES = [
    { name: 'BYD 6A', reportLabel: '6A' },
    { name: 'City Mall', reportLabel: 'CityMall' },
    { name: 'BYD 60M', reportLabel: '60M' }
];

const BRANCH_NAMES = BRANCHES.map(b => b.name);

const STATUSES = ['ordered', 'cancelled', 'not_ordered'];

const SYMBOLS = {
    ordered: '✅',
    cancelled: '❌',
    confirm: '✍️',
    blocked: '🚫'
};

const BRANCH_ALIASES = {
    'city mall': 'City Mall',
    citymall: 'City Mall',
    byd6a: 'BYD 6A',
    'byd 6a': 'BYD 6A',
    byd60m: 'BYD 60M',
    'byd 60m': 'BYD 60M'
};

module.exports = {
    BRANCHES,
    BRANCH_NAMES,
    STATUSES,
    SYMBOLS,
    BRANCH_ALIASES
};
