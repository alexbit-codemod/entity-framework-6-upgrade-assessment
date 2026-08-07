using System.Data.Entity;

namespace Sample
{
    public class StoreContext
    {
        public IDbSet<Customer> Customers { get; set; }
        public IDbSet<Order> Orders { get; set; }
    }

    public class Customer { }
    public class Order { }
}
