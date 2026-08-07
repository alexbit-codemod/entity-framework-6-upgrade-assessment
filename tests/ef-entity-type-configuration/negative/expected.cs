using System.Data.Entity;

namespace Sample
{
    public class CustomerMap : ComplexTypeConfiguration<Customer>
    {
    }

    public class CustomerContext : DbContext
    {
    }

    public class Customer { }
}
