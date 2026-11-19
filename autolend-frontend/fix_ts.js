const fs = require('fs');

// Fix lender
let lender = fs.readFileSync('src/app/lender/page.tsx', 'utf8');
lender = lender.replace('<DialogTrigger asChild>\n                              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">\n                                <Edit2 className="w-4 h-4 mr-2" /> Edit\n                              </Button>\n                            </DialogTrigger>', 
'<DialogTrigger className="text-white/70 hover:text-white hover:bg-white/10 p-2 text-sm rounded-md flex items-center justify-center"><Edit2 className="w-4 h-4 mr-2" /> Edit</DialogTrigger>');
fs.writeFileSync('src/app/lender/page.tsx', lender);

// Fix customer progress issue
let customer = fs.readFileSync('src/app/customer/page.tsx', 'utf8');
// remove the wrongly placed Progress on line 144
customer = customer.replace('<Progress value={0} className="h-2 bg-white/10" />\n                      <div className="h-48 bg-white/10 relative">', '<div className="h-48 bg-white/10 relative">');
// fix the real progress
customer = customer.replace('<Progress value={0} className="h-2 bg-white/10" indicatorColor="bg-blue-500" />', '<Progress value={0} className="h-2 bg-white/10" />');
fs.writeFileSync('src/app/customer/page.tsx', customer);

