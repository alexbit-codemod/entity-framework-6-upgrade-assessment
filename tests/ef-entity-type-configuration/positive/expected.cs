using System.Data.Entity.ModelConfiguration;

namespace Sample
{
    public class CustomerConfiguration : EntityTypeConfiguration<Customer>
    {
    }

    public class OrderConfiguration : EntityTypeConfiguration<Order>
    {
    }

    public class Customer { }
    public class Order { }
}
