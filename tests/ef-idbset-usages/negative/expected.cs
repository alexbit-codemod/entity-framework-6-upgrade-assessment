using System.Data.Entity;

namespace Sample
{
    public class StoreContext
    {
        public DbSet<Customer> Customers { get; set; }
        public IQueryable<Customer> Query { get; set; }
    }

    public class Customer { }
}
